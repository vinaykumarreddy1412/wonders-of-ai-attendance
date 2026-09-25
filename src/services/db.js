import * as XLSX from 'xlsx';
import initialStudentsData from '../data/initialStudents.json';
import { formatDate, formatTimeAMPM, evaluateSessionStatus } from '../utils/timeUtils';
import { db as firestoreDb } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';

const STORAGE_KEYS = {
  STUDENTS: 'euphoria_students_v2',
  SESSIONS: 'euphoria_sessions_v2',
  ATTENDANCE: 'euphoria_attendance_records_v2',
  VOLUNTEERS: 'euphoria_volunteers_v2',
  INITIALIZED: 'euphoria_initialized_v2',
  ADMIN_AUTH: 'euphoria_admin_session_v2',
  STUDENT_AUTH: 'euphoria_student_session_v2',
  VOLUNTEER_AUTH: 'euphoria_volunteer_session_v2'
};

// Initial 5 Default Volunteers (Max 5 Slots)
const DEFAULT_VOLUNTEERS = [
  { id: 'vol_1', name: 'Volunteer 1', username: 'volunteer1', passCode: 'vol123' },
  { id: 'vol_2', name: 'Volunteer 2', username: 'volunteer2', passCode: 'vol123' },
  { id: 'vol_3', name: 'Volunteer 3', username: 'volunteer3', passCode: 'vol123' },
  { id: 'vol_4', name: 'Volunteer 4', username: 'volunteer4', passCode: 'vol123' },
  { id: 'vol_5', name: 'Volunteer 5', username: 'volunteer5', passCode: 'vol123' }
];

// Cross-tab synchronization channel
let broadcastChannel = null;
try {
  broadcastChannel = new BroadcastChannel('euphoria_sync_channel');
} catch (e) {
  console.warn('BroadcastChannel not supported in this browser, relying on storage events');
}

const listeners = new Set();

function notifyListeners(type, payload) {
  listeners.forEach(cb => {
    try {
      cb({ type, payload });
    } catch (err) {
      console.error('Error notifying listener:', err);
    }
  });

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type, payload, timestamp: Date.now() });
    } catch (err) {
      console.error('Broadcast postMessage error:', err);
    }
  }
}

if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    if (event.data && event.data.type) {
      listeners.forEach(cb => {
        try {
          cb(event.data);
        } catch (err) {
          console.error('Broadcast listener error:', err);
        }
      });
    }
  };
}

// Also listen to window storage event as fallback
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key && event.key.startsWith('euphoria_')) {
      listeners.forEach(cb => {
        try {
          cb({ type: 'STORAGE_CHANGE', key: event.key });
        } catch (err) {
          console.error('Storage listener error:', err);
        }
      });
    }
  });
}

/**
 * Initialize DB with Excel dataset, default session, and 5 volunteer accounts
 */
export function initializeDB(forceReset = false) {
  if (typeof window === 'undefined') return;

  const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!isInitialized || forceReset) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(initialStudentsData));

    const todayFormatted = formatDate(new Date());
    const defaultSession = {
      sessionId: 'sess_euphoria_2026_main',
      sessionName: 'Euphoria 2026',
      date: todayFormatted,
      startTime: '08:00 AM',
      endTime: '11:59 PM',
      status: 'Active',
      qrToken: 'EUPHORIA2026_MAIN_' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      createdAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify([defaultSession]));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.VOLUNTEERS, JSON.stringify(DEFAULT_VOLUNTEERS));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');

    notifyListeners('DATABASE_INITIALIZED', { totalStudents: initialStudentsData.length });
  } else {
    if (!localStorage.getItem(STORAGE_KEYS.VOLUNTEERS)) {
      localStorage.setItem(STORAGE_KEYS.VOLUNTEERS, JSON.stringify(DEFAULT_VOLUNTEERS));
    }
  }
}

// Auto-run on load
initializeDB(false);

// Live Firestore Real-Time Listener Setup (Syncs across devices)
if (typeof window !== 'undefined' && firestoreDb) {
  try {
    // Listen for Firestore student changes
    onSnapshot(collection(firestoreDb, 'students'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteStudents = [];
        snapshot.forEach(docSnap => {
          remoteStudents.push(docSnap.data());
        });

        // Merge remote updates
        if (remoteStudents.length > 0) {
          const localStudents = getAllStudents();
          const localMap = new Map(localStudents.map(s => [s.registrationCode, s]));

          let changed = false;
          remoteStudents.forEach(remote => {
            const local = localMap.get(remote.registrationCode);
            if (local && (local.attendance !== remote.attendance || local.scannedBy !== remote.scannedBy)) {
              localMap.set(remote.registrationCode, { ...local, ...remote });
              changed = true;
            } else if (!local) {
              localMap.set(remote.registrationCode, remote);
              changed = true;
            }
          });

          if (changed) {
            const merged = Array.from(localMap.values());
            localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(merged));
            notifyListeners('FIRESTORE_SYNC', { type: 'STUDENTS' });
          }
        }
      }
    }, (err) => {
      console.warn('Firestore students sync listener notice:', err);
    });

    // Listen for Firestore attendance records
    onSnapshot(collection(firestoreDb, 'attendance'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteRecords = [];
        snapshot.forEach(docSnap => {
          remoteRecords.push(docSnap.data());
        });
        if (remoteRecords.length > 0) {
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(remoteRecords));
          notifyListeners('FIRESTORE_SYNC', { type: 'ATTENDANCE' });
        }
      }
    }, (err) => {
      console.warn('Firestore attendance sync listener notice:', err);
    });
  } catch (err) {
    console.warn('Firestore setup notice:', err);
  }
}

export function subscribeToDB(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/* ==================== STUDENTS ==================== */

export function getAllStudents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return raw ? JSON.parse(raw) : [...initialStudentsData];
  } catch (err) {
    console.error('Error reading students:', err);
    return [...initialStudentsData];
  }
}

export function saveAllStudents(students) {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    notifyListeners('STUDENTS_UPDATED', { count: students.length });
  } catch (err) {
    console.error('Error saving students:', err);
  }
}

export function findStudentByPassCode(passCode) {
  if (!passCode) return null;
  const cleanPass = String(passCode).trim().toLowerCase().replace(/[^\w]/g, '');
  const students = getAllStudents();
  return students.find(s => {
    const sPass = String(s.passCode || '').trim().toLowerCase().replace(/[^\w]/g, '');
    const sMobile = String(s.mobileNumber || '').trim().toLowerCase().replace(/[^\w]/g, '');
    const sReg = String(s.registrationCode || '').trim().toLowerCase().replace(/[^\w]/g, '');
    return sPass === cleanPass || sMobile === cleanPass || sReg === cleanPass;
  }) || null;
}

export function findStudentByRegCode(regCode) {
  if (!regCode) return null;
  const cleanReg = String(regCode).trim().toLowerCase().replace(/[^\w]/g, '');
  const students = getAllStudents();
  return students.find(s => {
    const sReg = String(s.registrationCode || '').trim().toLowerCase().replace(/[^\w]/g, '');
    return sReg === cleanReg;
  }) || null;
}

/**
 * Super resilient student login matching:
 * Matches Registration Code (exact, case-insensitive, or stripped)
 * Matches Mobile Number (exact digits or pass code)
 */
export function findStudentByCredentials(registrationCode, mobileOrPass) {
  if (!registrationCode && !mobileOrPass) return null;

  const rawReg = String(registrationCode || '').trim();
  const rawMobile = String(mobileOrPass || '').trim();

  const cleanReg = rawReg.toLowerCase().replace(/[^\w]/g, '');
  const cleanMobile = rawMobile.toLowerCase().replace(/[^\w]/g, '');

  const students = getAllStudents();

  // 1. Try matching both Registration Code and Mobile Number
  if (cleanReg && cleanMobile) {
    const exactBoth = students.find(s => {
      const sReg = String(s.registrationCode || '').toLowerCase().replace(/[^\w]/g, '');
      const sMobile = String(s.mobileNumber || '').toLowerCase().replace(/[^\w]/g, '');
      const sPass = String(s.passCode || '').toLowerCase().replace(/[^\w]/g, '');
      
      const regMatches = sReg === cleanReg || sReg.includes(cleanReg) || cleanReg.includes(sReg);
      const passMatches = sMobile === cleanMobile || sPass === cleanMobile || cleanMobile.includes(sMobile);

      return regMatches && passMatches;
    });
    if (exactBoth) return exactBoth;
  }

  // 2. Try matching by Registration Code alone if mobile matches passCode
  if (cleanReg) {
    const regMatch = students.find(s => {
      const sReg = String(s.registrationCode || '').toLowerCase().replace(/[^\w]/g, '');
      return sReg === cleanReg;
    });
    if (regMatch) return regMatch;
  }

  // 3. Try matching by Mobile Number alone
  if (cleanMobile) {
    const mobileMatch = students.find(s => {
      const sMobile = String(s.mobileNumber || '').toLowerCase().replace(/[^\w]/g, '');
      const sPass = String(s.passCode || '').toLowerCase().replace(/[^\w]/g, '');
      return sMobile === cleanMobile || sPass === cleanMobile;
    });
    if (mobileMatch) return mobileMatch;
  }

  return null;
}

/**
 * Generate unique participant QR payload.
 * Links to Registration Code and Participant ID without exposing sensitive passCode/password.
 */
export function getParticipantQRPayload(student) {
  if (!student) return '';
  return `EUPHORIA26:PID:${student.id}:REG:${student.registrationCode}`;
}

/**
 * Extract Registration Code from Participant QR payload
 */
export function parseParticipantQRPayload(qrText) {
  if (!qrText) return null;
  const trimmed = qrText.trim();

  // If format is EUPHORIA26:PID:<ID>:REG:<REG_CODE>
  if (trimmed.includes(':REG:')) {
    const parts = trimmed.split(':REG:');
    if (parts.length > 1) return parts[1].trim();
  }

  // If format is EUPH26:PART:<REG_CODE>
  if (trimmed.startsWith('EUPH26:PART:')) {
    return trimmed.replace('EUPH26:PART:', '').trim();
  }

  // If JSON payload
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.registrationCode) return parsed.registrationCode;
      if (parsed.regCode) return parsed.regCode;
    } catch {
      // not json
    }
  }

  // Direct registration code string (e.g. EUPH-26-852995-S1)
  const matched = findStudentByRegCode(trimmed);
  if (matched) return matched.registrationCode;

  return trimmed;
}

/* ==================== VOLUNTEERS ==================== */

export function getAllVolunteers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VOLUNTEERS);
    return raw ? JSON.parse(raw) : DEFAULT_VOLUNTEERS;
  } catch (err) {
    console.error('Error reading volunteers:', err);
    return DEFAULT_VOLUNTEERS;
  }
}

export function saveAllVolunteers(volunteers) {
  try {
    const capped = volunteers.slice(0, 5);
    localStorage.setItem(STORAGE_KEYS.VOLUNTEERS, JSON.stringify(capped));
    notifyListeners('VOLUNTEERS_UPDATED', { count: capped.length });
  } catch (err) {
    console.error('Error saving volunteers:', err);
  }
}

export function findVolunteerByCredentials(username, passCode) {
  if (!username || !passCode) return null;
  const cleanUser = username.trim().toLowerCase();
  const cleanPass = passCode.trim();
  const volunteers = getAllVolunteers();

  return volunteers.find(
    v => v.username && v.username.trim().toLowerCase() === cleanUser &&
         v.passCode && v.passCode.trim() === cleanPass
  ) || null;
}

export function updateVolunteer(id, { name, username, passCode }) {
  const volunteers = getAllVolunteers();
  const idx = volunteers.findIndex(v => v.id === id);
  if (idx !== -1) {
    volunteers[idx] = {
      ...volunteers[idx],
      name: name ? name.trim() : volunteers[idx].name,
      username: username ? username.trim() : volunteers[idx].username,
      passCode: passCode ? passCode.trim() : volunteers[idx].passCode
    };
    saveAllVolunteers(volunteers);

    // Sync to Firestore
    if (firestoreDb) {
      try {
        setDoc(doc(firestoreDb, 'volunteers', id), volunteers[idx], { merge: true }).catch(console.warn);
      } catch (e) {
        console.warn('Firestore updateVolunteer notice:', e);
      }
    }

    return volunteers[idx];
  }
  return null;
}

/* ==================== SESSIONS ==================== */

export function getAllSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading sessions:', err);
    return [];
  }
}

export function saveAllSessions(sessions) {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    notifyListeners('SESSIONS_UPDATED', { count: sessions.length });
  } catch (err) {
    console.error('Error saving sessions:', err);
  }
}

export function getSessionById(sessionId) {
  const sessions = getAllSessions();
  return sessions.find(s => s.sessionId === sessionId) || null;
}

export function getSessionByToken(token) {
  if (!token) return null;
  const cleanToken = token.trim();
  const sessions = getAllSessions();
  return sessions.find(s => s.qrToken === cleanToken) || null;
}

export function createSession({ sessionName, date, startTime, endTime }) {
  const sessions = getAllSessions();
  const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const token = 'EUPH26_' + sessionId.toUpperCase() + '_' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const newSession = {
    sessionId,
    sessionName: sessionName.trim() || 'Euphoria 2026 Session',
    date: date.trim(),
    startTime: startTime.trim(),
    endTime: endTime.trim(),
    status: 'Active',
    qrToken: token,
    createdAt: new Date().toISOString()
  };

  sessions.unshift(newSession);
  saveAllSessions(sessions);

  // Sync to Firestore
  if (firestoreDb) {
    try {
      setDoc(doc(firestoreDb, 'sessions', sessionId), newSession, { merge: true }).catch(console.warn);
    } catch (e) {
      console.warn('Firestore createSession notice:', e);
    }
  }

  return newSession;
}

export function updateSessionStatus(sessionId, newStatus) {
  const sessions = getAllSessions();
  const idx = sessions.findIndex(s => s.sessionId === sessionId);
  if (idx !== -1) {
    sessions[idx].status = newStatus;
    saveAllSessions(sessions);
    return sessions[idx];
  }
  return null;
}

export function deleteSession(sessionId) {
  let sessions = getAllSessions();
  sessions = sessions.filter(s => s.sessionId !== sessionId);
  saveAllSessions(sessions);
}

/* ==================== ATTENDANCE ==================== */

export function getAllAttendanceRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading attendance records:', err);
    return [];
  }
}

export function saveAllAttendanceRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
    notifyListeners('ATTENDANCE_UPDATED', { count: records.length });
  } catch (err) {
    console.error('Error saving attendance records:', err);
  }
}

export function getStudentAttendanceHistory(registrationCode) {
  if (!registrationCode) return [];
  const records = getAllAttendanceRecords();
  return records.filter(
    r => r.registrationCode.trim().toLowerCase() === registrationCode.trim().toLowerCase()
  ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Volunteer Scans Participant Unique QR Code & Syncs to Firebase Firestore
 */
export function recordAttendanceByVolunteer({ qrPayload, volunteerName }) {
  if (!qrPayload) {
    return {
      success: false,
      errorType: 'INVALID_QR',
      title: 'INVALID QR CODE',
      message: 'This participant is not registered.'
    };
  }

  const regCode = parseParticipantQRPayload(qrPayload);
  const student = regCode ? findStudentByRegCode(regCode) : null;

  if (!student) {
    return {
      success: false,
      errorType: 'INVALID_QR',
      title: 'INVALID QR CODE',
      message: 'This participant is not registered.'
    };
  }

  const records = getAllAttendanceRecords();
  const todayStr = formatDate(new Date());

  // Duplicate Check
  const existingRecord = records.find(
    r => r.registrationCode.trim().toLowerCase() === student.registrationCode.trim().toLowerCase() &&
         (r.status === 'PRESENT' || r.date === todayStr)
  );

  if (student.attendance === 'PRESENT' || existingRecord) {
    const originalTime = existingRecord ? existingRecord.time : (student.attendanceTime || 'Earlier');
    return {
      success: false,
      isDuplicate: true,
      errorType: 'DUPLICATE',
      title: 'ATTENDANCE ALREADY MARKED',
      message: 'Attendance already marked for this session.',
      student,
      originalTime
    };
  }

  const now = new Date();
  const dateStr = formatDate(now);
  const timeStr = formatTimeAMPM(now);
  const sessions = getAllSessions();
  const sessionName = sessions.length > 0 ? sessions[0].sessionName : 'Euphoria 2026';
  const sessionId = sessions.length > 0 ? sessions[0].sessionId : 'sess_main';

  const newRecord = {
    attendanceId: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    sessionId,
    sessionName,
    registrationCode: student.registrationCode,
    delegateFullName: student.delegateFullName,
    mobileNumber: student.mobileNumber,
    college: student.college,
    passCode: student.passCode,
    status: 'PRESENT',
    date: dateStr,
    time: timeStr,
    scannedBy: volunteerName || 'Volunteer',
    markedBy: 'VOLUNTEER_SCAN',
    timestamp: now.toISOString()
  };

  records.unshift(newRecord);
  saveAllAttendanceRecords(records);

  // Update student database entry
  const students = getAllStudents();
  const studentIdx = students.findIndex(
    s => s.registrationCode.trim().toLowerCase() === student.registrationCode.trim().toLowerCase()
  );

  if (studentIdx !== -1) {
    students[studentIdx].attendance = 'PRESENT';
    students[studentIdx].attendanceDate = dateStr;
    students[studentIdx].attendanceTime = timeStr;
    students[studentIdx].scannedBy = volunteerName || 'Volunteer';
    saveAllStudents(students);
  }

  // Real-time write to Firebase Firestore
  if (firestoreDb) {
    try {
      // 1. Write attendance record
      setDoc(doc(firestoreDb, 'attendance', newRecord.attendanceId), newRecord, { merge: true }).catch(console.warn);
      // 2. Update student doc in Firestore
      setDoc(doc(firestoreDb, 'students', student.registrationCode), {
        ...student,
        attendance: 'PRESENT',
        attendanceDate: dateStr,
        attendanceTime: timeStr,
        scannedBy: volunteerName || 'Volunteer'
      }, { merge: true }).catch(console.warn);
    } catch (err) {
      console.warn('Firestore recordAttendance notice:', err);
    }
  }

  return {
    success: true,
    title: '✓ ATTENDANCE MARKED',
    message: 'Attendance Marked Successfully!',
    student: {
      ...student,
      attendance: 'PRESENT'
    },
    date: dateStr,
    time: timeStr,
    scannedBy: volunteerName || 'Volunteer',
    record: newRecord
  };
}

/**
 * Admin Manual Attendance Toggle / Change
 */
export function adminSetStudentAttendance({ registrationCode, newStatus, sessionId = null, adminName = 'Admin' }) {
  const students = getAllStudents();
  const studentIdx = students.findIndex(
    s => s.registrationCode.trim().toLowerCase() === registrationCode.trim().toLowerCase()
  );

  if (studentIdx === -1) {
    return { success: false, error: 'Student not found.' };
  }

  const student = students[studentIdx];
  const now = new Date();
  const dateStr = formatDate(now);
  const timeStr = formatTimeAMPM(now);

  student.attendance = newStatus;
  student.attendanceDate = newStatus === 'NOT MARKED' ? '' : dateStr;
  student.attendanceTime = newStatus === 'NOT MARKED' ? '' : timeStr;
  student.scannedBy = newStatus === 'NOT MARKED' ? '' : adminName;
  saveAllStudents(students);

  const sessions = getAllSessions();
  const targetSession = sessionId 
    ? getSessionById(sessionId) 
    : (sessions.length > 0 ? sessions[0] : null);

  const records = getAllAttendanceRecords();

  if (targetSession) {
    const existingIdx = records.findIndex(
      r => r.sessionId === targetSession.sessionId &&
           r.registrationCode.trim().toLowerCase() === registrationCode.trim().toLowerCase()
    );

    if (newStatus === 'PRESENT') {
      if (existingIdx !== -1) {
        records[existingIdx].status = 'PRESENT';
        records[existingIdx].markedBy = 'MANUAL_ADMIN';
        records[existingIdx].scannedBy = adminName;
        records[existingIdx].date = dateStr;
        records[existingIdx].time = timeStr;
      } else {
        records.unshift({
          attendanceId: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          sessionId: targetSession.sessionId,
          sessionName: targetSession.sessionName,
          registrationCode: student.registrationCode,
          delegateFullName: student.delegateFullName,
          mobileNumber: student.mobileNumber,
          college: student.college,
          passCode: student.passCode,
          status: 'PRESENT',
          date: dateStr,
          time: timeStr,
          scannedBy: adminName,
          markedBy: 'MANUAL_ADMIN',
          timestamp: now.toISOString()
        });
      }
    } else if (newStatus === 'ABSENT') {
      if (existingIdx !== -1) {
        records[existingIdx].status = 'ABSENT';
        records[existingIdx].markedBy = 'MANUAL_ADMIN';
        records[existingIdx].scannedBy = adminName;
      } else {
        records.unshift({
          attendanceId: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          sessionId: targetSession.sessionId,
          sessionName: targetSession.sessionName,
          registrationCode: student.registrationCode,
          delegateFullName: student.delegateFullName,
          mobileNumber: student.mobileNumber,
          college: student.college,
          passCode: student.passCode,
          status: 'ABSENT',
          date: dateStr,
          time: timeStr,
          scannedBy: adminName,
          markedBy: 'MANUAL_ADMIN',
          timestamp: now.toISOString()
        });
      }
    } else if (newStatus === 'NOT MARKED') {
      if (existingIdx !== -1) {
        records.splice(existingIdx, 1);
      }
    }

    saveAllAttendanceRecords(records);
  }

  // Update Firestore
  if (firestoreDb) {
    try {
      setDoc(doc(firestoreDb, 'students', student.registrationCode), {
        ...student,
        attendance: newStatus,
        attendanceDate: newStatus === 'NOT MARKED' ? '' : dateStr,
        attendanceTime: newStatus === 'NOT MARKED' ? '' : timeStr,
        scannedBy: newStatus === 'NOT MARKED' ? '' : adminName
      }, { merge: true }).catch(console.warn);
    } catch (e) {
      console.warn('Firestore admin attendance update notice:', e);
    }
  }

  return { success: true, student };
}

/* ==================== STATS ==================== */

export function getAttendanceStats() {
  const students = getAllStudents();
  const totalDelegates = students.length;
  let present = 0;
  let absent = 0;
  let notMarked = 0;

  students.forEach(s => {
    const status = (s.attendance || 'NOT MARKED').toUpperCase();
    if (status === 'PRESENT') present++;
    else if (status === 'ABSENT') absent++;
    else notMarked++;
  });

  const attendancePercentage = totalDelegates > 0 
    ? Math.round((present / totalDelegates) * 100) 
    : 0;

  return {
    totalDelegates,
    present,
    absent,
    notMarked,
    attendancePercentage
  };
}

/* ==================== EXCEL EXPORT & IMPORT ==================== */

/**
 * Export attendance data to Excel .xlsx file
 */
export function exportAttendanceExcel() {
  const students = getAllStudents();
  const records = getAllAttendanceRecords();
  const sessions = getAllSessions();
  const latestSessionName = sessions.length > 0 ? sessions[0].sessionName : 'Euphoria 2026';

  const recordMap = new Map();
  records.forEach(rec => {
    const key = rec.registrationCode.trim().toLowerCase();
    if (!recordMap.has(key)) {
      recordMap.set(key, rec);
    }
  });

  const exportRows = students.map((student) => {
    const key = student.registrationCode.trim().toLowerCase();
    const rec = recordMap.get(key);

    return {
      'Registration Code': student.registrationCode,
      'Delegate Full Name': student.delegateFullName,
      'Mobile Number': student.mobileNumber,
      'College / Institution': student.college,
      'Pass Code': student.passCode,
      'Session Name': rec ? rec.sessionName : latestSessionName,
      'Date': rec ? rec.date : (student.attendanceDate || '-'),
      'Time': rec ? rec.time : (student.attendanceTime || '-'),
      'Scanned By': rec ? (rec.scannedBy || '-') : (student.scannedBy || '-'),
      'Attendance Status': student.attendance || 'NOT MARKED'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  const colWidths = [
    { wch: 22 }, // Reg code
    { wch: 28 }, // Name
    { wch: 16 }, // Mobile
    { wch: 32 }, // College
    { wch: 20 }, // Pass Code
    { wch: 20 }, // Session
    { wch: 14 }, // Date
    { wch: 14 }, // Time
    { wch: 18 }, // Scanned By
    { wch: 18 }  // Status
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

  const fileName = `Euphoria_2026_Attendance_${formatDate(new Date()).replace(/\//g, '-')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Parse and import custom Excel file if uploaded by admin
 */
export async function importCustomExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const mapped = jsonData.map((row, index) => {
          const findVal = (patterns) => {
            for (const key of Object.keys(row)) {
              const cleanKey = key.trim().toLowerCase();
              for (const p of patterns) {
                if (cleanKey === p.toLowerCase()) return String(row[key] ?? '').trim();
              }
            }
            return '';
          };

          const regCode = findVal(['Registration Code', 'RegistrationCode', 'Reg Code', 'RegCode', 'Registration_Code', 'Reg_Code']) || `EUPH-${1000 + index}`;
          const fullName = findVal(['Delegate Full Name', 'Delegate Name', 'FullName', 'Name', 'Delegate_Full_Name']) || `Delegate ${index + 1}`;
          const mobile = findVal(['Mobile Number', 'Mobile', 'MobileNumber', 'Phone', 'Contact']) || '';
          const college = findVal(['College / Institution', 'College/Institution', 'College', 'Institution']) || 'Euphoria Participant';
          const passCode = findVal(['Pass Code', 'PassCode', 'Pass_Code', 'Password']) || `PASS${1000 + index}`;
          const attRaw = findVal(['Attendance', 'Attendance Status', 'Status']) || 'NOT MARKED';

          let att = 'NOT MARKED';
          if (attRaw.toUpperCase() === 'PRESENT') att = 'PRESENT';
          else if (attRaw.toUpperCase() === 'ABSENT') att = 'ABSENT';

          return {
            id: `student_${index + 1}`,
            registrationCode: regCode,
            delegateFullName: fullName,
            mobileNumber: mobile,
            college: college,
            passCode: passCode,
            attendance: att
          };
        });

        if (mapped.length === 0) {
          throw new Error('No valid delegate rows found in Excel sheet.');
        }

        saveAllStudents(mapped);

        // Sync to Firestore
        if (firestoreDb) {
          try {
            for (const item of mapped) {
              setDoc(doc(firestoreDb, 'students', item.registrationCode), item, { merge: true }).catch(console.warn);
            }
          } catch (err) {
            console.warn('Firestore batch import notice:', err);
          }
        }

        resolve({ success: true, count: mapped.length });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

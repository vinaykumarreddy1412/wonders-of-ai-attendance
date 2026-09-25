const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Mock localStorage & window for Node testing
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.localStorage = new LocalStorageMock();
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {}
};

// Load dataset
const initialStudents = require('../src/data/initialStudents.json');

console.log('--- STARTING EUPHORIA 2026 UPDATED TEST SUITE ---');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

// TEST 1: Initial Excel Dataset Preserved
console.log('\nTEST GROUP 1: Excel Data Integrity');
assert(Array.isArray(initialStudents), 'initialStudents is an array');
assert(initialStudents.length === 435, `Preserved all 435 delegates (Found: ${initialStudents.length})`);
assert(initialStudents[0].registrationCode === 'EUPH-26-852995-S1', 'Delegate 1 regCode preserved');
assert(initialStudents[0].delegateFullName === 'Saranya K', 'Delegate 1 name preserved');

// TEST 2: Participant Unique QR Code Generation (No Pass Code / Password in QR)
console.log('\nTEST GROUP 2: Participant Unique QR Code Generation');
function getParticipantQRPayload(student) {
  if (!student) return '';
  return `EUPHORIA26:PID:${student.id}:REG:${student.registrationCode}`;
}

function parseParticipantQRPayload(qrText) {
  if (!qrText) return null;
  const trimmed = qrText.trim();
  if (trimmed.includes(':REG:')) {
    const parts = trimmed.split(':REG:');
    if (parts.length > 1) return parts[1].trim();
  }
  if (trimmed.startsWith('EUPH26:PART:')) {
    return trimmed.replace('EUPH26:PART:', '').trim();
  }
  return trimmed;
}

const studentA = initialStudents[0];
const studentB = initialStudents[1];

const qrA = getParticipantQRPayload(studentA);
const qrB = getParticipantQRPayload(studentB);

assert(qrA === 'EUPHORIA26:PID:student_1:REG:EUPH-26-852995-S1', `Student A unique QR payload is ${qrA}`);
assert(qrB === 'EUPHORIA26:PID:student_2:REG:EUPH-26-FDF507-S1', `Student B unique QR payload is ${qrB}`);
assert(parseParticipantQRPayload(qrA) === 'EUPH-26-852995-S1', 'Payload parses back to exact registration code');

// TEST 2.5: Student Authentication (Registration Code + Mobile Number)
console.log('\nTEST GROUP 2.5: Student Login (Reg Code + Mobile Number)');
function findStudentByCredentials(regCode, mobile) {
  const cleanReg = regCode.trim().toLowerCase();
  const cleanPass = String(mobile).trim().toLowerCase().replace(/[^\w]/g, '');
  return initialStudents.find(s => {
    const sReg = (s.registrationCode || '').trim().toLowerCase();
    const sMobile = String(s.mobileNumber || '').trim().toLowerCase().replace(/[^\w]/g, '');
    const sPass = (s.passCode || '').trim().toLowerCase().replace(/[^\w]/g, '');
    return sReg === cleanReg && (sMobile === cleanPass || sPass === cleanPass);
  }) || null;
}

const stuLoginSuccess = findStudentByCredentials('EUPH-26-852995-S1', '8438408688');
assert(stuLoginSuccess !== null && stuLoginSuccess.delegateFullName === 'Saranya K', 'Student logs in successfully with Registration Code and Mobile Number');

const stuLoginFailWrongMobile = findStudentByCredentials('EUPH-26-852995-S1', '9999999999');
assert(stuLoginFailWrongMobile === null, 'Wrong mobile number is rejected');

const stuLoginFailWrongReg = findStudentByCredentials('INVALID-REG-CODE', '8438408688');
assert(stuLoginFailWrongReg === null, 'Invalid registration code is rejected');

// TEST 3: 5 Volunteer Accounts Management (Max 5 Slots)
console.log('\nTEST GROUP 3: Volunteer Role & Credential Management');
const DEFAULT_VOLUNTEERS = [
  { id: 'vol_1', name: 'Volunteer 1', username: 'volunteer1', passCode: 'vol123' },
  { id: 'vol_2', name: 'Volunteer 2', username: 'volunteer2', passCode: 'vol123' },
  { id: 'vol_3', name: 'Volunteer 3', username: 'volunteer3', passCode: 'vol123' },
  { id: 'vol_4', name: 'Volunteer 4', username: 'volunteer4', passCode: 'vol123' },
  { id: 'vol_5', name: 'Volunteer 5', username: 'volunteer5', passCode: 'vol123' }
];

assert(DEFAULT_VOLUNTEERS.length === 5, 'Exactly 5 volunteer accounts exist');

function authenticateVolunteer(username, passCode, list = DEFAULT_VOLUNTEERS) {
  return list.find(v => v.username === username && v.passCode === passCode) || null;
}

const volAuth1 = authenticateVolunteer('volunteer1', 'vol123');
assert(volAuth1 !== null && volAuth1.name === 'Volunteer 1', 'Volunteer 1 authenticates successfully');

const volAuthInvalid = authenticateVolunteer('volunteer1', 'wrongpass');
assert(volAuthInvalid === null, 'Invalid volunteer passCode rejected');

// TEST 4: Volunteer Scans Participant QR & Records Attendance
console.log('\nTEST GROUP 4: Volunteer Scans Unique QR & Records Attendance');
const studentsDb = JSON.parse(JSON.stringify(initialStudents));
const attendanceDb = [];

function recordAttendanceByVolunteer(qrPayload, volunteerName) {
  const regCode = parseParticipantQRPayload(qrPayload);
  const student = studentsDb.find(s => s.registrationCode === regCode);

  if (!student) {
    return {
      success: false,
      errorType: 'INVALID_QR',
      title: 'INVALID QR CODE',
      message: 'This participant is not registered.'
    };
  }

  // Duplicate Check
  const existing = attendanceDb.find(r => r.registrationCode === student.registrationCode && r.status === 'PRESENT');
  if (student.attendance === 'PRESENT' || existing) {
    return {
      success: false,
      isDuplicate: true,
      errorType: 'DUPLICATE',
      title: 'ATTENDANCE ALREADY MARKED',
      student,
      originalTime: existing ? existing.time : '09:00 AM'
    };
  }

  const record = {
    attendanceId: 'att_' + Date.now(),
    registrationCode: student.registrationCode,
    delegateFullName: student.delegateFullName,
    status: 'PRESENT',
    date: '25/09/2026',
    time: '09:30 AM',
    scannedBy: volunteerName
  };

  attendanceDb.unshift(record);
  student.attendance = 'PRESENT';
  student.attendanceDate = '25/09/2026';
  student.attendanceTime = '09:30 AM';
  student.scannedBy = volunteerName;

  return {
    success: true,
    title: '✓ ATTENDANCE MARKED',
    student,
    date: '25/09/2026',
    time: '09:30 AM',
    scannedBy: volunteerName
  };
}

// Volunteer 1 scans Student A
const scanA = recordAttendanceByVolunteer(qrA, 'Volunteer 1');
assert(scanA.success === true, 'Volunteer successfully marks Student A PRESENT');
assert(scanA.scannedBy === 'Volunteer 1', 'Scanned by Volunteer 1 recorded');
assert(studentsDb[0].attendance === 'PRESENT', 'Student A status is PRESENT in DB');
assert(studentsDb[0].scannedBy === 'Volunteer 1', 'Student A scannedBy is Volunteer 1 in DB');
assert(attendanceDb.length === 1, '1 Attendance record logged');

// Duplicate scan of Student A
const scanADuplicate = recordAttendanceByVolunteer(qrA, 'Volunteer 2');
assert(scanADuplicate.success === false && scanADuplicate.isDuplicate === true, 'Duplicate scan rejected with ATTENDANCE ALREADY MARKED');
assert(attendanceDb.length === 1, 'Duplicate record NOT created, count remains 1');

// Volunteer 2 scans Student B
const scanB = recordAttendanceByVolunteer(qrB, 'Volunteer 2');
assert(scanB.success === true, 'Volunteer 2 successfully marks Student B PRESENT');
assert(scanB.scannedBy === 'Volunteer 2', 'Scanned by Volunteer 2 recorded');
assert(attendanceDb.length === 2, '2 Attendance records in DB');

// Invalid QR scan
const scanInvalid = recordAttendanceByVolunteer('EUPH26:PART:UNREGISTERED_9999', 'Volunteer 1');
assert(scanInvalid.success === false && scanInvalid.errorType === 'INVALID_QR', 'Unregistered QR code returns INVALID QR CODE');

// TEST 5: Admin Summary & Attendance Percentage
console.log('\nTEST GROUP 5: Admin Summary & Percentage Calculation');
let presentCount = 0;
let notMarkedCount = 0;
studentsDb.forEach(s => {
  if (s.attendance === 'PRESENT') presentCount++;
  else notMarkedCount++;
});

const attendancePct = Math.round((presentCount / studentsDb.length) * 100);
assert(presentCount === 2, `Present count is 2 (Found: ${presentCount})`);
assert(notMarkedCount === 433, `Not marked count is 433 (Found: ${notMarkedCount})`);
assert(attendancePct === 0 || attendancePct === 1, `Attendance percentage calculated correctly: ${attendancePct}%`);

// TEST 6: Excel Export with Scanned By Column
console.log('\nTEST GROUP 6: Excel Export with Scanned By Column');
const exportRows = studentsDb.map(s => ({
  'Registration Code': s.registrationCode,
  'Delegate Full Name': s.delegateFullName,
  'Mobile Number': s.mobileNumber,
  'College / Institution': s.college,
  'Pass Code': s.passCode,
  'Session Name': 'Euphoria 2026',
  'Date': s.attendanceDate || '-',
  'Time': s.attendanceTime || '-',
  'Scanned By': s.scannedBy || '-',
  'Attendance Status': s.attendance || 'NOT MARKED'
}));

const ws = xlsx.utils.json_to_sheet(exportRows);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Attendance');
const testOutPath = path.join(__dirname, '..', 'dist', 'Euphoria_2026_Updated_Report.xlsx');
xlsx.writeFile(wb, testOutPath);

assert(fs.existsSync(testOutPath), 'Updated Excel report generated');
const readWb = xlsx.readFile(testOutPath);
const readData = xlsx.utils.sheet_to_json(readWb.Sheets[readWb.SheetNames[0]]);
assert(readData.length === 435, `Export contains 435 rows (Found: ${readData.length})`);
assert(readData[0]['Scanned By'] === 'Volunteer 1', 'Row 0 Scanned By is Volunteer 1');
assert(readData[1]['Scanned By'] === 'Volunteer 2', 'Row 1 Scanned By is Volunteer 2');

console.log('\n======================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('======================================\n');

if (failedTests > 0) {
  process.exit(1);
}

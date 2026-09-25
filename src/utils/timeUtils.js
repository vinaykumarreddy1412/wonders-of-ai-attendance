/**
 * Utility functions for date and AM/PM time formatting and comparisons
 */

// Format a Date object to "DD/MM/YYYY"
export function formatDate(date = new Date()) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Format a Date object to "YYYY-MM-DD" for HTML input[type="date"]
export function formatDateInput(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format a Date object to "hh:mm AM/PM"
export function formatTimeAMPM(date = new Date()) {
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 is 12
  const formattedHours = String(hours).padStart(2, '0');
  return `${formattedHours}:${minutes} ${ampm}`;
}

// Parse "09:00 AM" or "9:00 AM" or "09:00" to minutes from midnight
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const str = timeStr.trim().toUpperCase();
  const isPM = str.includes('PM');
  const isAM = str.includes('AM');
  
  const cleanStr = str.replace(/[^\d:]/g, '');
  const [hStr, mStr] = cleanStr.split(':');
  let hours = parseInt(hStr || '0', 10);
  const minutes = parseInt(mStr || '0', 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

// Parse "DD/MM/YYYY" or "YYYY-MM-DD" to Date object at midnight
export function parseDateString(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      // DD/MM/YYYY
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  return new Date(dateStr);
}

// Convert 24-hr time input "09:00" or "14:30" to "09:00 AM" or "02:30 PM"
export function convert24To12AMPM(time24) {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let hours = parseInt(hStr, 10);
  const minutes = mStr || '00';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

// Convert 12-hr AM/PM time "09:00 AM" to "09:00" for input[type="time"]
export function convert12To24(time12) {
  if (!time12) return '09:00';
  const mins = parseTimeToMinutes(time12);
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Check session status with Admin override support
 * @param {Object} session 
 * @returns {{ status: 'ACTIVE' | 'CLOSED', message: string, canScan: boolean }}
 */
export function evaluateSessionStatus(session) {
  if (!session) {
    return { status: 'CLOSED', message: 'Session not found.', canScan: false };
  }

  // If manually closed or ended by admin
  if (session.status === 'Closed' || session.status === 'CLOSED' || session.status === 'Ended') {
    return { status: 'CLOSED', message: 'This attendance session is currently closed.', canScan: false };
  }

  // If set to Active by Admin (can be opened or reopened at any time)
  if (session.status === 'Active' || session.status === 'ACTIVE') {
    return { status: 'ACTIVE', message: 'Attendance session is currently active.', canScan: true };
  }

  return { status: 'ACTIVE', message: 'Attendance session is currently active.', canScan: true };
}

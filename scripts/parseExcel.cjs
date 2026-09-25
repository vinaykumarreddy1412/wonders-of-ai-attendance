const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const excelPath = path.join(__dirname, '..', 'Euphoria_2026_Attendance(1).xlsx');
console.log('Reading:', excelPath);

const workbook = xlsx.readFile(excelPath);
console.log('Sheets:', workbook.SheetNames);

const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];
const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

console.log('Total rows:', jsonData.length);
if (jsonData.length > 0) {
  console.log('First row columns:', Object.keys(jsonData[0]));
  console.log('Sample row 0:', JSON.stringify(jsonData[0], null, 2));
  console.log('Sample row 1:', JSON.stringify(jsonData[1], null, 2));
}

// Map accurately according to requirements:
// Registration Code → registrationCode
// Delegate Full Name → delegateFullName
// Mobile Number → mobileNumber
// College / Institution → college
// Pass Code → passCode
// Attendance → initial attendance (PRESENT, ABSENT, or NOT MARKED)

const normalizedStudents = jsonData.map((row, index) => {
  // Find matching keys case-insensitively / trimmed
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
  const fullName = findVal(['Delegate Full Name', 'Delegate Name', 'FullName', 'Name', 'Delegate_Full_Name', 'DelegateFullName']) || `Delegate ${index + 1}`;
  const mobile = findVal(['Mobile Number', 'Mobile', 'MobileNumber', 'Phone', 'Contact', 'Mobile_Number']) || '';
  const college = findVal(['College / Institution', 'College/Institution', 'College', 'Institution', 'College_Institution']) || 'Euphoria Participant';
  const passCode = findVal(['Pass Code', 'PassCode', 'Pass_Code', 'Password', 'Passcode']) || `PASS${1000 + index}`;
  const attendanceRaw = findVal(['Attendance', 'Status', 'Attendance Status']) || 'NOT MARKED';
  
  let attendance = 'NOT MARKED';
  if (attendanceRaw.toUpperCase() === 'PRESENT') attendance = 'PRESENT';
  else if (attendanceRaw.toUpperCase() === 'ABSENT') attendance = 'ABSENT';

  return {
    id: `student_${index + 1}`,
    registrationCode: regCode,
    delegateFullName: fullName,
    mobileNumber: mobile,
    college: college,
    passCode: passCode,
    attendance: attendance
  };
});

const srcDir = path.join(__dirname, '..', 'src', 'data');
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir, { recursive: true });
}

fs.writeFileSync(
  path.join(srcDir, 'initialStudents.json'),
  JSON.stringify(normalizedStudents, null, 2),
  'utf-8'
);

console.log(`Successfully mapped and exported ${normalizedStudents.length} students to src/data/initialStudents.json`);

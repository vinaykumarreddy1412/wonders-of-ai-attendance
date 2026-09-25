const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const excelPath = path.join(__dirname, '..', 'Euphoria_2026_Attendance.xlsx');
console.log('Reading Excel file from:', excelPath);

const workbook = xlsx.readFile(excelPath);
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];
const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

console.log(`Sheet Name: ${firstSheetName}`);
console.log(`Total Rows Found: ${jsonData.length}`);

if (jsonData.length > 0) {
  console.log('Columns in sheet:', Object.keys(jsonData[0]));
}

const normalizedStudents = jsonData.map((row, index) => {
  const findVal = (patterns) => {
    for (const key of Object.keys(row)) {
      const cleanKey = key.trim().toLowerCase();
      for (const p of patterns) {
        if (cleanKey === p.toLowerCase()) return String(row[key] ?? '').trim();
      }
    }
    return '';
  };

  const regCode = findVal(['Registration Code', 'RegistrationCode', 'Reg Code', 'RegCode', 'Registration_Code', 'Reg_Code']) || `EUPH-26-REG-${1000 + index}`;
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

const srcDataPath = path.join(__dirname, '..', 'src', 'data', 'initialStudents.json');
fs.writeFileSync(srcDataPath, JSON.stringify(normalizedStudents, null, 2), 'utf-8');
console.log(`Saved ${normalizedStudents.length} normalized student records to src/data/initialStudents.json`);

// Now sync with Firebase Firestore
const serviceAccountPath = path.join(__dirname, '..', 'firebase-admin-key.json');
if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  const app = initializeApp({
    credential: cert(serviceAccount)
  });
  const db = getFirestore(app);

  async function syncFirestore() {
    console.log(`Syncing ${normalizedStudents.length} delegates to Firebase project '${serviceAccount.project_id}'...`);
    
    // Process in batches of 400
    const chunkSize = 400;
    for (let i = 0; i < normalizedStudents.length; i += chunkSize) {
      const chunk = normalizedStudents.slice(i, i + chunkSize);
      const batch = db.batch();
      
      for (const student of chunk) {
        const docRef = db.collection('students').doc(student.registrationCode);
        batch.set(docRef, {
          ...student,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      }
      
      await batch.commit();
      console.log(`Committed chunk ${i + 1} to ${Math.min(i + chunkSize, normalizedStudents.length)}`);
    }

    console.log('✅ Firebase Firestore synchronized successfully with latest Excel data!');
  }

  syncFirestore().catch(err => {
    console.error('Firestore sync error:', err);
  });
} else {
  console.log('No firebase-admin-key.json found; skipping Firestore sync.');
}

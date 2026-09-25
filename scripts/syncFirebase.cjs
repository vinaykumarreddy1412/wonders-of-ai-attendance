const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'firebase-admin-key.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Service account key file not found at:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function seedFirestore() {
  console.log(`Connecting to Firebase project: ${serviceAccount.project_id}...`);

  const initialStudents = require('../src/data/initialStudents.json');
  console.log(`Uploading ${initialStudents.length} students to Firestore collection 'students'...`);

  // Batch writes (max 500 per batch)
  const batch = db.batch();
  let count = 0;

  for (const student of initialStudents) {
    const docRef = db.collection('students').doc(student.registrationCode);
    batch.set(docRef, {
      ...student,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    count++;
  }

  // Upload Volunteers
  const DEFAULT_VOLUNTEERS = [
    { id: 'vol_1', name: 'Volunteer 1', username: 'volunteer1', passCode: 'vol123' },
    { id: 'vol_2', name: 'Volunteer 2', username: 'volunteer2', passCode: 'vol123' },
    { id: 'vol_3', name: 'Volunteer 3', username: 'volunteer3', passCode: 'vol123' },
    { id: 'vol_4', name: 'Volunteer 4', username: 'volunteer4', passCode: 'vol123' },
    { id: 'vol_5', name: 'Volunteer 5', username: 'volunteer5', passCode: 'vol123' }
  ];

  for (const vol of DEFAULT_VOLUNTEERS) {
    const docRef = db.collection('volunteers').doc(vol.id);
    batch.set(docRef, {
      ...vol,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  // Upload Default Session
  const sessionRef = db.collection('sessions').doc('sess_euphoria_2026_main');
  batch.set(sessionRef, {
    sessionId: 'sess_euphoria_2026_main',
    sessionName: 'Euphoria 2026',
    date: '25/09/2026',
    startTime: '08:00 AM',
    endTime: '11:59 PM',
    status: 'Active',
    createdAt: new Date().toISOString()
  }, { merge: true });

  console.log('Committing Firestore batch...');
  await batch.commit();

  console.log(`✅ Successfully connected and synced ${count} students, 5 volunteers, and session data to Firebase Firestore!`);
  
  // Verify by reading back a doc
  const testDoc = await db.collection('students').doc('EUPH-26-852995-S1').get();
  if (testDoc.exists) {
    console.log('Verified student doc from Firestore:', testDoc.data().delegateFullName);
  }
}

seedFirestore().catch(err => {
  console.error('Firestore connection/sync error:', err);
  process.exit(1);
});

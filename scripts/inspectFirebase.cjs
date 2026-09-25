const fs = require('fs');
const path = require('path');

const keyPath = path.join(__dirname, '..', 'firebase-admin-key.json');
if (fs.existsSync(keyPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  console.log('Firebase Service Account loaded:');
  console.log('Project ID:', serviceAccount.project_id);
  console.log('Client Email:', serviceAccount.client_email);
  console.log('Has Private Key:', !!serviceAccount.private_key);
} else {
  console.error('File not found:', keyPath);
}

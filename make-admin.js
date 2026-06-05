/* eslint-disable @typescript-eslint/no-require-imports */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = 'b9d8LkvSCTef7PTLoD97JmQrDKg2'; // <-- GANTI DENGAN UID LU

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`Success! Admin claim added to user: ${uid}`);
    process.exit();
  })
  .catch((error) => {
    console.error('Error adding admin claim:', error);
    process.exit(1);
  });
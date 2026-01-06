import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    // ВРЕМЕННОЕ ИСПРАВЛЕНИЕ: Жестко кодируем URL, чтобы исправить ошибку сборки.
    databaseURL: "https://relaxdev-af44c-default-rtdb.europe-west1.firebasedatabase.app",
  });
}

const db = admin.database();
const adminAuth = admin.auth();

export { db, adminAuth };

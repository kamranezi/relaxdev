import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Исправление для переносов строк в приватном ключе
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    // ОБЯЗАТЕЛЬНО укажи URL базы данных
    databaseURL: "https://relaxdev-af44c-default-rtdb.europe-west1.firebasedatabase.app" 
    // (URL возьми в консоли Firebase -> Realtime Database)
  });
}

const db = admin.database();

export { db };
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  let privateKeyEnv = process.env.FIREBASE_PRIVATE_KEY || '';

  // Удаляем кавычки в начале и конце строки, если они есть
  if (privateKeyEnv.startsWith('"') && privateKeyEnv.endsWith('"')) {
    privateKeyEnv = privateKeyEnv.substring(1, privateKeyEnv.length - 1);
  }

  // Надежно исправляем приватный ключ, заменяя эскейп-последовательности на реальные переносы строк
  const privateKey = privateKeyEnv.replace(/\\n/g, '\n');

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  };

  try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    // Вывод дополнительной информации для отладки
    if (error.code === 'app/invalid-credential') {
      console.error('Detail: The service account credential is not valid. This is often caused by a malformed private key.');
      console.error(`Project ID from env: ${process.env.FIREBASE_PROJECT_ID}`);
      console.error(`Client Email from env: ${process.env.FIREBASE_CLIENT_EMAIL}`);
    }
  }
}

const db = admin.apps.length ? admin.database() : null;
const adminAuth = admin.apps.length ? admin.auth() : null;

export { db, adminAuth };

import * as admin from 'firebase-admin';

// Эта проверка гарантирует, что мы инициализируем приложение только один раз.
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('FIREBASE_PRIVATE_KEY is not set in the environment variables.');
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Ключ передается из Yandex Cloud с \n. Эта замена абсолютно необходима.
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL, // Используем переменную окружения
  });
}

const db = admin.database();
const adminAuth = admin.auth();

export { db, adminAuth };

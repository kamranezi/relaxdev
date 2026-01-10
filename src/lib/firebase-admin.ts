import * as admin from 'firebase-admin';

let db: admin.database.Database | null = null;
let adminAuth: admin.auth.Auth | null = null;

// Проверяем, не была ли уже инициализирована Firebase
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

    db = admin.database();
    adminAuth = admin.auth();
    console.log('Firebase Admin SDK initialized successfully.');

  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
    // При ошибке db и adminAuth останутся null
  }
} else {
  // Если приложение уже инициализировано, просто получаем сервисы
  db = admin.app().database();
  adminAuth = admin.app().auth();
}

export { db, adminAuth };

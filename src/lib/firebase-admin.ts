import * as admin from 'firebase-admin';

// Функция для безопасного парсинга JSON
const safeJsonParse = (jsonString: string) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return null;
  }
};

if (!admin.apps.length) {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';

  // В некоторых окружениях (например, GitHub Actions) ключ может быть уже в формате JSON-строки.
  // В других (Yandex Cloud) - это может быть просто строка, которую нужно обработать.
  if (privateKey.startsWith('{')) { // Простой эвристический способ проверить, является ли это JSON
      const parsedKey = safeJsonParse(privateKey);
      if (parsedKey && parsedKey.private_key) {
          privateKey = parsedKey.private_key;
      }
  } else {
      // Если это не JSON, заменяем \n на реальные переносы строк, как и раньше.
      privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  };

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

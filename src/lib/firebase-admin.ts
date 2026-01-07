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
  let privateKeyEnv = process.env.FIREBASE_PRIVATE_KEY || '';
  
  // Удаляем кавычки в начале и конце строки, если они есть
  if (privateKeyEnv.startsWith('"') && privateKeyEnv.endsWith('"')) {
    privateKeyEnv = privateKeyEnv.substring(1, privateKeyEnv.length - 1);
  }

  let privateKey;

  // В некоторых окружениях (например, GitHub Actions) ключ может быть уже в формате JSON-строки.
  // В других (Yandex Cloud) - это может быть просто строка, которую нужно обработать.
  if (privateKeyEnv.startsWith('{')) { // Простой эвристический способ проверить, является ли это JSON
      const parsedKey = safeJsonParse(privateKeyEnv);
      if (parsedKey && parsedKey.private_key) {
          privateKey = parsedKey.private_key.replace(/\\n/g, '\n');
      } else {
        // Если парсинг не удался, возвращаемся к старому методу
        privateKey = privateKeyEnv.replace(/\\n/g, '\n');
      }
  } else {
      // Если это не JSON, заменяем \n на реальные переносы строк, как и раньше.
      privateKey = privateKeyEnv.replace(/\\n/g, '\n');
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // ВРЕМЕННОЕ ИСПРАВЛЕНИЕ: Жестко кодируем URL, чтобы исправить ошибку сборки.
    databaseURL: "https://relaxdev-af44c-default-rtdb.europe-west1.firebasedatabase.app",
  });
}

const db = admin.database();
const adminAuth = admin.auth();

export { db, adminAuth };

// lib/firebase.ts
import * as admin from 'firebase-admin';

// 1. Безопасно получаем ключ.
// Если переменной нет (например, при сборке), будет undefined
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

// 2. Инициализируем только если приложение еще не запущено
if (!admin.apps.length) {
  // 3. ГЛАВНАЯ ПРОВЕРКА: Если ключа нет, мы НЕ вызываем initializeApp.
  // Это спасает сборку от ошибки "Service account object must contain..."
  if (privateKey && process.env.FIREBASE_CLIENT_EMAIL) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "relaxdev-af44c",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      databaseURL: "https://relaxdev-af44c-default-rtdb.europe-west1.firebasedatabase.app"
    });
  } else {
    // В логах сборки это нормально увидеть
    console.warn("⚠️ Firebase Admin не инициализирован (отсутствуют ключи, это нормально при Build step)");
  }
}

// 4. Безопасно экспортируем db
// Используем `any` или `admin.database.Database`, чтобы TypeScript не ругался
let db: admin.database.Database;

// Пытаемся получить базу, только если инициализация прошла успешно
if (admin.apps.length) {
  db = admin.database();
}

// Если инициализации не было, db будет undefined.
// Это позволит сборке пройти (Next.js сможет импортировать файл, не падая).
export { db };
'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Или где лежит твой конфиг
import { db } from "@/lib/firebase";

// Хелпер для очистки email (Realtime DB не любит точки в ключах)
// user@gmail.com -> user@gmail_com
const sanitizeEmail = (email: string) => email.replace(/\./g, '_');

// 1. Создание проекта
export async function createProject(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    throw new Error("Не авторизован");
  }

  const emailKey = sanitizeEmail(session.user.email);
  
  const projectName = formData.get("name") as string;
  const repoUrl = formData.get("repoUrl") as string;

  // Ссылка на список проектов ЭТОГО пользователя
  const userProjectsRef = db.ref(`users/${emailKey}/projects`);

  // Push создает уникальный ID (типа -Nzd7...) автоматически
  await userProjectsRef.push({
    name: projectName,
    repoUrl: repoUrl,
    status: 'created',
    createdAt: Date.now(),
    // Можно сохранить реальный email на всякий случай
    ownerEmail: session.user.email 
  });

  return { success: true };
}

// 2. Получение списка проектов
export async function getProjects() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    return []; // Возвращаем пустоту, если не вошел
  }

  const emailKey = sanitizeEmail(session.user.email);
  
  // Читаем только ветку этого пользователя
  const snapshot = await db.ref(`users/${emailKey}/projects`).once('value');
  const data = snapshot.val();

  if (!data) return [];

  // Превращаем объект объектов в массив
  // { "-ID1": {name...}, "-ID2": {name...} } -> [ {id: "-ID1", name...}, ... ]
  return Object.entries(data).map(([key, value]: [string, unknown]) => ({
    id: key,
    ...(value as object),
  }));
}

// 3. Сохранение переменных окружения
export async function saveEnvVars(projectId: string, envText: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Auth required");

  const emailKey = sanitizeEmail(session.user.email);
  
  // Пишем прямо по пути к проекту
  await db.ref(`users/${emailKey}/projects/${projectId}`).update({
    envVars: envText, // Можно хранить строкой или распарсить в объект
    status: 'redeploy_needed'
  });
  
  // Тут вызов Yandex Cloud API для редеплоя...
}
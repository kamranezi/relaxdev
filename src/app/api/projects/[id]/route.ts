// src/app/api/projects/[id]/route.ts

import { NextResponse } from 'next/server';
import { db, adminAuth } from "@/lib/firebase-admin";
import { getContainerByName } from '@/lib/yandex';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Проверка БД
    if (!db || !adminAuth) {
      return NextResponse.json({ error: "Firebase connection not initialized" }, { status: 500 });
    }

    const params = await context.params;
    const id = params.id;

    // 1. Пытаемся получить токен, но НЕ блокируем сразу (для публичных проектов)
    const authHeader = request.headers.get('Authorization');
    let currentUserEmail = null;
    let isAdmin = false;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        currentUserEmail = decodedToken.email;
        
        // Проверяем админа
        const adminRef = db.ref(`admins/${decodedToken.uid}`);
        const adminSnapshot = await adminRef.once('value');
        isAdmin = adminSnapshot.val() === true;
      } catch (e) {
        console.warn('Invalid token check:', e);
      }
    }

    // 2. Получаем проект из базы
    const projectRef = db.ref(`projects/${id}`);
    const snapshot = await projectRef.once('value');
    let project = snapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 3. Проверка прав доступа
    const isOwner = currentUserEmail && project.owner === currentUserEmail;
    // Разрешаем если: Публичный ИЛИ Владелец ИЛИ Админ
    if (!project.isPublic && !isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. ⭐ СИНХРОНИЗАЦИЯ С ЯНДЕКСОМ (Статус и Домен)
    try {
        const container = await getContainerByName(project.name);
        if (container) {
            const updates: any = {};
            
            // Обновляем статус
            let newStatus = project.status;
            if (container.status === 'ACTIVE') newStatus = 'Активен';
            else if (container.status === 'ERROR' || container.status === 'STOPPED') newStatus = 'Ошибка';
            
            if (newStatus !== project.status) {
                updates.status = newStatus;
                project.status = newStatus;
            }

            // ⭐ Обновляем домен (ссылку), если она есть в контейнере
            if (container.url && container.url !== project.domain) {
                updates.domain = container.url;
                project.domain = container.url;
            }

            // Сохраняем изменения в базу
            if (Object.keys(updates).length > 0) {
                // update выполняем фоново, чтобы не тормозить ответ пользователю (но await надежнее)
                await projectRef.update(updates);
            }
        }
    } catch (e) {
        console.error('Failed to sync with Yandex:', e);
        // Не блокируем ответ, если Яндекс недоступен, отдаем данные из базы
    }

    // 5. Очистка секретных данных для гостей
    if (!isOwner && !isAdmin) {
        delete project.envVars;
        delete project.gitToken;
        delete project.deploymentLogs;
    }

    return NextResponse.json(project);

  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!db || !adminAuth) {
      return NextResponse.json({ error: "Firebase connection not initialized" }, { status: 500 });
    }

    // Проверка авторизации (обязательна для удаления)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token); // Просто проверяем валидность

    const params = await context.params;
    const { id } = params;
    
    // Удаляем из базы
    await db.ref(`projects/${id}`).remove();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!db || !adminAuth) {
      return NextResponse.json({ error: "Firebase connection not initialized" }, { status: 500 });
    }

    // Проверка авторизации (обязательна для редактирования)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const params = await context.params;
    const { id } = params;
    const body = await request.json();

    const projectRef = db.ref(`projects/${id}`);
    await projectRef.update(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
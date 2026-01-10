import { NextResponse } from 'next/server';
import { db, adminAuth } from "@/lib/firebase-admin";
import { getContainerByName, deleteContainer } from '@/lib/yandex';

// --- GET: Получение проекта ---
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!db || !adminAuth) {
      return NextResponse.json({ error: "Firebase connection not initialized" }, { status: 500 });
    }

    const params = await context.params;
    const id = params.id;

    // --- Авторизация ---
    const authHeader = request.headers.get('Authorization');
    let currentUserEmail = null;
    let isAdmin = false;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        currentUserEmail = decodedToken.email ? decodedToken.email.toLowerCase() : null;
        
        // Проверяем isAdmin внутри профиля пользователя users/{uid}
        const userRef = db.ref(`users/${decodedToken.uid}`);
        const userSnapshot = await userRef.once('value');
        isAdmin = userSnapshot.val()?.isAdmin === true;
      } catch (e) {
        console.warn('Invalid token check:', e);
      }
    }

    const projectRef = db.ref(`projects/${id}`);
    const snapshot = await projectRef.once('value');
    let project = snapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectOwnerEmail = project.owner ? project.owner.toLowerCase() : '';
    const isOwner = currentUserEmail && projectOwnerEmail === currentUserEmail;

    // Проверка доступа (Публичный ИЛИ Владелец ИЛИ Админ)
    if (!project.isPublic && !isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- Синхронизация с Яндексом ---
    try {
        const container = await getContainerByName(project.id);
        
        if (container) {
            const updates: any = {};
            
            let newStatus = project.status;
            if (container.status === 'ACTIVE') newStatus = 'Активен';
            else if (container.status === 'ERROR' || container.status === 'STOPPED') newStatus = 'Ошибка';
            
            if (newStatus !== project.status) {
                updates.status = newStatus;
                project.status = newStatus;
            }

            if (container.url && (!project.domain || project.domain !== container.url)) {
                updates.domain = container.url;
                project.domain = container.url;
            }

            if (Object.keys(updates).length > 0) {
                await projectRef.update(updates);
            }
        }
    } catch (e) {
        console.error('Failed to sync with Yandex:', e);
    }

    // Добавляем флаг прав редактирования
    const canEdit = !!(isAdmin || isOwner);
    project.canEdit = canEdit;

    // Очистка секретов для гостей (не владельцев и не админов)
    if (!canEdit) {
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

// --- DELETE: Удаление проекта и контейнера ---
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
    try {
        if (!db || !adminAuth) return NextResponse.json({error: "No DB"}, {status:500});
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({error:'Unauthorized'}, {status:401});
        
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const currentUserEmail = decodedToken.email?.toLowerCase();

        // Проверка Админа
        const userRef = db.ref(`users/${decodedToken.uid}`);
        const userSnapshot = await userRef.once('value');
        const isAdmin = userSnapshot.val()?.isAdmin === true;

        const params = await context.params;
        const projectId = params.id;
        const projectRef = db.ref(`projects/${projectId}`);
        const projectSnapshot = await projectRef.once('value');
        const project = projectSnapshot.val();

        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

        const isOwner = project.owner?.toLowerCase() === currentUserEmail;

        if (!isOwner && !isAdmin) {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 1. УДАЛЕНИЕ КОНТЕЙНЕРА В ЯНДЕКСЕ
        try {
            // Ищем контейнер по имени проекта (ID проекта)
            const container = await getContainerByName(projectId);
            if (container && container.id) {
                console.log(`Deleting container ${container.name} (${container.id})...`);
                await deleteContainer(container.id);
            } else {
                console.warn(`Container for project ${projectId} not found in Yandex, skipping cloud deletion.`);
            }
        } catch (yandexError) {
            console.error('Failed to delete Yandex container:', yandexError);
            // Продолжаем удаление из БД, даже если Яндекс выдал ошибку (чтобы не блокировать удаление "призраков")
        }

        // 2. УДАЛЕНИЕ ИЗ БАЗЫ ДАННЫХ
        await projectRef.remove();
        
        return NextResponse.json({ success: true });
    } catch(e) { 
        console.error(e);
        return NextResponse.json({error:'Error'}, {status:500}); 
    }
}

// --- PUT: Обновление проекта (переменные окружения и т.д.) ---
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
    try {
        if (!db || !adminAuth) return NextResponse.json({error: "No DB"}, {status:500});
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({error:'Unauthorized'}, {status:401});
        
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const currentUserEmail = decodedToken.email?.toLowerCase();

        const userRef = db.ref(`users/${decodedToken.uid}`);
        const userSnapshot = await userRef.once('value');
        const isAdmin = userSnapshot.val()?.isAdmin === true;

        const params = await context.params;
        const projectRef = db.ref(`projects/${params.id}`);
        const projectSnapshot = await projectRef.once('value');
        const project = projectSnapshot.val();

        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        
        const isOwner = project.owner?.toLowerCase() === currentUserEmail;

        if (!isOwner && !isAdmin) {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        delete body.owner; // Не даем менять владельца

        await projectRef.update(body);
        return NextResponse.json({ success: true });
    } catch(e) { 
        console.error(e);
        return NextResponse.json({error:'Error'}, {status:500}); 
    }
}
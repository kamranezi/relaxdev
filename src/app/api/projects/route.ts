import { NextResponse } from 'next/server';
import { db, adminAuth } from "@/lib/firebase-admin";
import { getContainerByName } from '@/lib/yandex';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!db || !adminAuth) {
      return NextResponse.json({ error: "Firebase not initialized" }, { status: 500 });
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
        currentUserEmail = decodedToken.email;
        
        const adminRef = db.ref(`admins/${decodedToken.uid}`);
        const adminSnapshot = await adminRef.once('value');
        isAdmin = adminSnapshot.val() === true;
      } catch (e) {
        console.warn('Invalid token:', e);
      }
    }

    const projectRef = db.ref(`projects/${id}`);
    const snapshot = await projectRef.once('value');
    let project = snapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const isOwner = currentUserEmail && project.owner === currentUserEmail;
    
    // ⭐ ИСПРАВЛЕНИЕ: Админ имеет доступ ко всем проектам
    if (!project.isPublic && !isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Синхронизация с Yandex (оставляем как было)
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

    // Если не владелец и не админ - скрываем секреты
    if (!isOwner && !isAdmin) {
        delete project.envVars;
        delete project.gitToken;
        delete project.deploymentLogs;
        delete project.webhookId; // Тоже скроем
    }

    return NextResponse.json(project);

  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ⭐ DELETE С УДАЛЕНИЕМ ИЗ ЯНДЕКСА
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
        const currentUserEmail = decodedToken.email;

        // Проверяем админа
        const adminRef = db.ref(`admins/${decodedToken.uid}`);
        const adminSnapshot = await adminRef.once('value');
        const isAdmin = adminSnapshot.val() === true;

        const params = await context.params;
        const projectId = params.id;
        const projectRef = db.ref(`projects/${projectId}`);
        const snapshot = await projectRef.once('value');
        const project = snapshot.val();

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Проверяем права: Владелец или Админ
        if (project.owner !== currentUserEmail && !isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 1. Удаляем контейнер из Яндекс Облака
        try {
            console.log(`[API] Deleting Yandex container: ${projectId}`);
            // Используем YC CLI (должен быть настроен на сервере)
            // 2> /dev/null подавляет ошибки, если контейнера уже нет
            await execPromise(`yc serverless container delete --name ${projectId} --force`);
            
            // Опционально: Удалить образы из Registry.
            // Это сложнее, так как надо знать ID Registry и имя образа.
            // Обычно имя образа = projectId.
            // await execPromise(`yc container image list --registry-id ${process.env.YC_REGISTRY_ID} --format json | jq ...`);
            // Пока ограничимся удалением контейнера, чтобы не удалить лишнее.
            
        } catch (e: any) {
            console.error('Failed to delete Yandex container (might not exist):', e.message);
            // Не прерываем удаление из базы, если контейнера уже нет
        }

        // 2. Удаляем запись из базы данных
        await projectRef.remove();
        console.log(`[API] Project ${projectId} deleted from DB`);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT без изменений
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
        const currentUserEmail = decodedToken.email;

        // Проверка админа
        const adminRef = db.ref(`admins/${decodedToken.uid}`);
        const isAdmin = (await adminRef.once('value')).val() === true;

        const params = await context.params;
        const projectRef = db.ref(`projects/${params.id}`);
        const currentProject = (await projectRef.once('value')).val();

        if (!currentProject) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        if (currentProject.owner !== currentUserEmail && !isAdmin) {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        await projectRef.update(body);
        return NextResponse.json({ success: true });
    } catch(e) { 
        return NextResponse.json({error:'Error'}, {status:500}); 
    }
}
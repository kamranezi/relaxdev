import { NextResponse } from 'next/server';
import { db, adminAuth } from "@/lib/firebase-admin";
import { getContainerByName, deleteContainer, deleteProjectRegistry } from '@/lib/yandex';

// --- GET: Получение проекта ---
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!db || !adminAuth) return NextResponse.json({ error: "No DB" }, { status: 500 });

    const { id } = await context.params;
    const authHeader = request.headers.get('Authorization');
    let currentUserEmail = null, isAdmin = false;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const decoded = await adminAuth.verifyIdToken(token);
        currentUserEmail = decoded.email?.toLowerCase() || null;
        
        const [uSnap, aSnap] = await Promise.all([
            db.ref(`users/${decoded.uid}`).once('value'),
            db.ref(`admins/${decoded.uid}`).once('value')
        ]);
        isAdmin = (uSnap.val()?.isAdmin === true) || (aSnap.val() === true);
      } catch (e) { console.warn(e); }
    }

    const projectRef = db.ref(`projects/${id}`);
    const project = (await projectRef.once('value')).val();

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // ⭐ ЛОГИКА АВТО-СБРОСА ЗАВИСШИХ СБОРОК
    if (project.status === 'Сборка' || project.status === 'Building') {
        const now = Date.now();
        // Пытаемся понять, когда началась сборка
        let startTime = project.buildStartedAt;
        
        if (!startTime && project.updatedAt) {
            startTime = new Date(project.updatedAt).getTime();
        }

        // Если времени старта нет или прошло > 15 минут
        if (startTime && (now - startTime > 15 * 60 * 1000)) {
            console.warn(`[Project GET] Fixing stuck build for ${id}`);
            const errorUpdates = {
                status: 'Ошибка',
                deploymentLogs: 'Build timed out (15m limit). Check GitHub Actions logs.',
                updatedAt: new Date().toISOString()
            };
            await projectRef.update(errorUpdates);
            
            // Обновляем данные для текущего ответа
            project.status = 'Ошибка';
            project.deploymentLogs = errorUpdates.deploymentLogs;
        }
    }

    const isOwner = currentUserEmail && project.owner?.toLowerCase() === currentUserEmail;
    if (!project.isPublic && !isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Синхронизация с Yandex Cloud (если статус не зависший)
    try {
        if (project.status !== 'Сборка') { // Не трогаем статус, если идет реальная сборка
            const container = await getContainerByName(project.id);
            if (container) {
                const updates: any = {};
                const newStatus = container.status === 'ACTIVE' ? 'Активен' : (['ERROR', 'STOPPED'].includes(container.status) ? 'Ошибка' : project.status);
                
                if (newStatus !== project.status) { updates.status = newStatus; project.status = newStatus; }
                if (container.url && project.domain !== container.url) { updates.domain = container.url; project.domain = container.url; }
                if (Object.keys(updates).length) await projectRef.update(updates);
            }
        }
    } catch (e) { console.error('Sync failed:', e); }

    const canEdit = !!(isAdmin || isOwner);
    project.canEdit = canEdit;

    if (canEdit) {
        let vars = project.envVars;
        if (vars && typeof vars === 'object' && !Array.isArray(vars)) vars = Object.values(vars);
        project.envVars = Array.isArray(vars) ? vars : []; 
    } else {
        delete project.envVars; delete project.gitToken; delete project.deploymentLogs;
    }

    return NextResponse.json(project);
  } catch (e) { return NextResponse.json({ error: 'Server Error' }, { status: 500 }); }
}

// ... (остальной код DELETE и PUT без изменений)
// --- DELETE: Удаление проекта ---
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        if (!db || !adminAuth) return NextResponse.json({ error: "No DB" }, { status: 500 });
        
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const token = authHeader.split('Bearer ')[1];
        const decoded = await adminAuth.verifyIdToken(token);
        const email = decoded.email?.toLowerCase();

        const [uSnap, aSnap] = await Promise.all([
            db.ref(`users/${decoded.uid}`).once('value'),
            db.ref(`admins/${decoded.uid}`).once('value')
        ]);
        const isAdmin = (uSnap.val()?.isAdmin === true) || (aSnap.val() === true);

        const { id } = await context.params;
        const projectRef = db.ref(`projects/${id}`);
        const project = (await projectRef.once('value')).val();

        if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (project.owner?.toLowerCase() !== email && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // 1. Удаляем контейнер
        try {
            const container = await getContainerByName(id);
            if (container?.id) await deleteContainer(container.id);
        } catch (e) { console.error('Container delete failed:', e); }

        // 2. Удаляем образы
        try { await deleteProjectRegistry(id); } catch (e) { console.error('Registry delete failed:', e); }

        // 3. Удаляем из БД
        await projectRef.remove();
        return NextResponse.json({ success: true });
    } catch (e) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}

// --- PUT: Обновление ---
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        if (!db || !adminAuth) return NextResponse.json({ error: "No DB" }, { status: 500 });
        
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const token = authHeader.split('Bearer ')[1];
        const decoded = await adminAuth.verifyIdToken(token);
        
        const [uSnap, aSnap] = await Promise.all([
            db.ref(`users/${decoded.uid}`).once('value'),
            db.ref(`admins/${decoded.uid}`).once('value')
        ]);
        const isAdmin = (uSnap.val()?.isAdmin === true) || (aSnap.val() === true);

        const { id } = await context.params;
        const projectRef = db.ref(`projects/${id}`);
        const project = (await projectRef.once('value')).val();

        if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (project.owner?.toLowerCase() !== decoded.email?.toLowerCase() && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        delete body.owner; 
        
        await projectRef.update(body);
        return NextResponse.json({ success: true });
    } catch (e) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}
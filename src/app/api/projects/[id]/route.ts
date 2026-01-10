// src/app/api/projects/[id]/route.ts

import { NextResponse } from 'next/server';
import { db, adminAuth } from "@/lib/firebase-admin";
import { getContainerByName } from '@/lib/yandex';

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
        currentUserEmail = decodedToken.email;
        
        const adminRef = db.ref(`admins/${decodedToken.uid}`);
        const adminSnapshot = await adminRef.once('value');
        isAdmin = adminSnapshot.val() === true;
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

    const isOwner = currentUserEmail && project.owner === currentUserEmail;
    if (!project.isPublic && !isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. ⭐ СИНХРОНИЗАЦИЯ С ЯНДЕКСОМ (ИСПРАВЛЕНИЕ)
    try {
        // Ищем контейнер по ID (safeName), а не по Display Name
        const container = await getContainerByName(project.id);
        
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

            // ⭐ Обновляем домен, если он появился в Яндексе, но пуст в базе
            if (container.url && (!project.domain || project.domain !== container.url)) {
                updates.domain = container.url;
                project.domain = container.url;
            }

            // Сохраняем в Firebase
            if (Object.keys(updates).length > 0) {
                await projectRef.update(updates);
            }
        }
    } catch (e) {
        console.error('Failed to sync with Yandex:', e);
    }

    // Очистка секретов для гостей
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

// ... методы DELETE и PUT оставьте без изменений ...
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
    try {
        if (!db || !adminAuth) return NextResponse.json({error: "No DB"}, {status:500});
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({error:'Unauthorized'}, {status:401});
        const params = await context.params;
        await db.ref(`projects/${params.id}`).remove();
        return NextResponse.json({ success: true });
    } catch(e) { return NextResponse.json({error:'Error'}, {status:500}); }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
    try {
        if (!db || !adminAuth) return NextResponse.json({error: "No DB"}, {status:500});
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({error:'Unauthorized'}, {status:401});
        const params = await context.params;
        const body = await request.json();
        await db.ref(`projects/${params.id}`).update(body);
        return NextResponse.json({ success: true });
    } catch(e) { return NextResponse.json({error:'Error'}, {status:500}); }
}
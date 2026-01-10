// src/app/api/projects/[id]/route.ts

import { NextResponse } from 'next/server';
import { db, adminAuth } from "@/lib/firebase-admin";
import { getContainerByName, deleteContainer } from '@/lib/yandex'; // Импортируем deleteContainer

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // ... Вставьте сюда исправленный ранее код для GET (из прошлого ответа), 
  // где мы поменяли проверку isAdmin на `users/...`.
  // Для экономии места здесь только DELETE и PUT, так как вопрос был про них.
  
  // (ЕСЛИ НУЖНО, Я МОГУ ПРОДУБЛИРОВАТЬ GET ЦЕЛИКОМ, НО ВЫ ЕГО УЖЕ МЕНЯЛИ)
  return NextResponse.json({error: "Use previous GET implementation"}, {status: 500}); 
}

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

        // ⭐ Исправленная проверка Админа
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

        // ⭐ 1. УДАЛЕНИЕ КОНТЕЙНЕРА В ЯНДЕКСЕ
        try {
            // Сначала ищем контейнер, чтобы получить его ID (не имя, а ID типа bba...)
            const container = await getContainerByName(projectId);
            if (container && container.id) {
                console.log(`Deleting container ${container.name} (${container.id})...`);
                await deleteContainer(container.id);
            } else {
                console.warn(`Container for project ${projectId} not found in Yandex, skipping cloud deletion.`);
            }
        } catch (yandexError) {
            console.error('Failed to delete Yandex container:', yandexError);
            // Мы не прерываем удаление из БД, если упал Яндекс, 
            // но можно вернуть предупреждение клиенту, если нужно.
        }

        // 2. УДАЛЕНИЕ ИЗ БАЗЫ ДАННЫХ
        await projectRef.remove();
        
        return NextResponse.json({ success: true });
    } catch(e) { 
        console.error(e);
        return NextResponse.json({error:'Error'}, {status:500}); 
    }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
    // ... Тоже не забудьте обновить проверку isAdmin тут, как делали выше ...
     try {
        if (!db || !adminAuth) return NextResponse.json({error: "No DB"}, {status:500});
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({error:'Unauthorized'}, {status:401});
        
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const currentUserEmail = decodedToken.email?.toLowerCase();

        // ⭐ Исправленная проверка Админа
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
    } catch(e) { return NextResponse.json({error:'Error'}, {status:500}); }
}
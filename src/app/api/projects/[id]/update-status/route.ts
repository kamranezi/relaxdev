import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'relaxdev-secret';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) {
      console.error('[Update Status] Firebase not initialized');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Проверка секрета из webhook
    const secret = request.headers.get('x-webhook-secret');
    if (secret !== WEBHOOK_SECRET) {
      console.error('[Update Status] Invalid webhook secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const projectId = params.id;

    // Получаем тело запроса
    const body = await request.json();
    const { status, deploymentLogs, domain } = body;

    console.log(`[Update Status] 📥 Received update for ${projectId}:`, {
      status,
      domain: domain || 'not provided',
      logs: deploymentLogs ? `${deploymentLogs.substring(0, 50)}...` : 'none'
    });

    // Проверяем, существует ли проект
    const projectRef = db.ref(`projects/${projectId}`);
    const snapshot = await projectRef.once('value');
    
    if (!snapshot.exists()) {
      console.error(`[Update Status] ❌ Project not found: ${projectId}`);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Формируем обновления
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    // Мапим статусы из workflow в наши статусы
    if (status === 'success') {
      updates.status = 'Активен';
      updates.lastDeployed = new Date().toISOString();
      console.log(`[Update Status] ✅ Marking ${projectId} as Активен`);
    } else if (status === 'error') {
      updates.status = 'Ошибка';
      console.log(`[Update Status] ❌ Marking ${projectId} as Ошибка`);
    } else if (status === 'building') {
      updates.status = 'Сборка';
      console.log(`[Update Status] 🔨 Marking ${projectId} as Сборка`);
    } else {
      // Если пришёл незнакомый статус, логируем и сохраняем как есть
      updates.status = status;
      console.warn(`[Update Status] ⚠️ Unknown status "${status}" for ${projectId}`);
    }

    // Добавляем логи деплоя если есть
    if (deploymentLogs) {
      updates.deploymentLogs = deploymentLogs;
    }

    // Добавляем домен если есть
    if (domain) {
      updates.domain = domain;
      console.log(`[Update Status] 🌐 Domain for ${projectId}: ${domain}`);
    }

    // Обновляем проект в Firebase
    await projectRef.update(updates);

    console.log(`[Update Status] ✅ Successfully updated ${projectId}`);

    return NextResponse.json({
      success: true,
      project: projectId,
      updates,
    });

  } catch (error: any) {
    console.error('[Update Status] ❌ Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update status' },
      { status: 500 }
    );
  }
}
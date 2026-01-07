import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/lib/firebase-admin";
export const dynamic = 'force-dynamic';

// Этот endpoint вызывается из GitHub Actions workflow для обновления статуса проекта
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();
    const { status, buildErrors, missingEnvVars, deploymentLogs, domain } = body;

    const secret = request.headers.get('x-webhook-secret');
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 });
    }

    const projectRef = db.ref(`projects/${params.id}`);
    const projectSnapshot = await projectRef.once('value');
    const project = projectSnapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (status) {
      if (status === 'success' || status === 'ACTIVE') {
        updates.status = 'Активен';
        updates.lastDeployed = new Date().toISOString(); 
      } else if (status === 'building' || status === 'in_progress') {
        updates.status = 'Сборка';
      } else {
        updates.status = 'Ошибка';
      }
    }

    if (buildErrors) {
      updates.buildErrors = Array.isArray(buildErrors) ? buildErrors : [buildErrors];
    }

    if (missingEnvVars) {
      updates.missingEnvVars = Array.isArray(missingEnvVars) ? missingEnvVars : [missingEnvVars];
    }

    if (deploymentLogs) {
      updates.deploymentLogs = deploymentLogs;
    }

    if (domain) {
      updates.domain = domain.endsWith('/') ? domain.slice(0, -1) : domain;
    }

    await projectRef.update(updates);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
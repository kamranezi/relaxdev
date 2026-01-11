import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { Octokit } from '@octokit/rest';
import crypto from 'crypto';

const BUILDER_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'relaxdev-secret';

// Функция проверки подписи
function verifySignature(req: NextRequest, body: string) {
    const signature = req.headers.get('x-hub-signature-256');
    if (!signature) return false;
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(body).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(req: NextRequest) {
  try {
    if (!db) {
      console.error('Firebase Admin DB not initialized');
      return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
    }

    const eventType = req.headers.get('x-github-event');
    const rawBody = await req.text();
    
    // ⚠️ Раскомментируйте для проверки подписи в production
    // if (!verifySignature(req, rawBody)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const payload = JSON.parse(rawBody);
    
    // Ping event
    if (payload.zen) {
      return NextResponse.json({ message: 'Pong!' }, { status: 200 });
    }

    // ⭐ УДАЛЕНО: Обработка workflow_run (это делает сам workflow через update-status)
    // Workflow сам вызывает /api/projects/:id/update-status в конце
    
    // ⭐ ЛОГИКА АВТОДЕПЛОЯ ПРИ PUSH
    if (eventType === 'push') {
        const ref = payload.ref;
        
        // Проверяем, что это push в main
        if (ref !== 'refs/heads/main') {
            console.log(`[Webhook] Ignoring push to ${ref}`);
            return NextResponse.json({ message: 'Not main branch' }, { status: 200 });
        }

        const gitUrl = payload.repository.html_url;
        const pusher = payload.pusher?.name || 'unknown';
        
        console.log(`[Webhook] Push to main by ${pusher}: ${gitUrl}`);

        // Ищем проекты с этим репозиторием
        const projectsRef = db.ref('projects');
        const snapshot = await projectsRef
            .orderByChild('repoUrl')
            .equalTo(gitUrl)
            .once('value');
        
        const projects = snapshot.val();

        if (!projects) {
            console.log(`[Webhook] No projects found for ${gitUrl}`);
            return NextResponse.json({ message: 'Project not found' }, { status: 404 });
        }

        const octokit = new Octokit({ auth: BUILDER_TOKEN });
        const deployedProjects: string[] = [];

        // Обрабатываем каждый проект
        for (const [projectId, project] of Object.entries(projects) as [string, any][]) {
            // Проверяем, включен ли автодеплой
            if (project.autodeploy === false) {
                console.log(`[Webhook] Autodeploy disabled for ${projectId}`);
                continue;
            }

            console.log(`[Webhook] Triggering autodeploy for: ${project.name} (${projectId})`);
            
            // Получаем токен пользователя
            const userRef = db.ref(`users`);
            const usersSnapshot = await userRef
                .orderByChild('email')
                .equalTo(project.owner)
                .limitToFirst(1)
                .once('value');
            
            const users = usersSnapshot.val();
            
            if (!users) {
                console.error(`[Webhook] Owner not found for project ${projectId}`);
                continue;
            }
            
            const ownerUid = Object.keys(users)[0];
            const userData = users[ownerUid];
            const gitToken = userData?.githubAccessToken;

            // Запускаем workflow
            try {
                await octokit.actions.createWorkflowDispatch({
                    owner: process.env.BUILDER_REPO_OWNER || 'kamranezi',
                    repo: process.env.BUILDER_REPO_NAME || 'ruvercel-builder',
                    workflow_id: 'universal-builder.yml',
                    ref: 'main',
                    inputs: {
                        gitUrl: gitUrl,
                        projectName: projectId, // ⭐ ВАЖНО: передаём ID проекта
                        gitToken: gitToken || '',
                        owner: project.owner,
                        envVars: project.envVars ? JSON.stringify(project.envVars) : '[]',
                    },
                });
                
                // Обновляем статус на "Сборка"
                const now = new Date().toISOString();
                await db.ref(`projects/${projectId}`).update({ 
                    status: 'Сборка',
                    updatedAt: now,
                    lastDeployed: now,
                    buildStartedAt: Date.now() // ⭐ Добавляем метку времени старта (timestamp)
                });
                
                deployedProjects.push(projectId);
                console.log(`[Webhook] Successfully triggered build for ${projectId}`);
            } catch (err: any) {
                console.error(`[Webhook] Failed to trigger build for ${projectId}:`, err.message);
            }
        }
        
        return NextResponse.json({ 
            success: true, 
            deployed: deployedProjects,
            message: `Deployed ${deployedProjects.length} project(s)`
        });
    }

    // Игнорируем остальные события
    console.log(`[Webhook] Ignored event: ${eventType}`);
    return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
    
  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ 
      error: 'Webhook failed',
      details: error.message 
    }, { status: 500 });
  }
}
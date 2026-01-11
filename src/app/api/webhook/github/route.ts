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
    // if (!verifySignature(req, rawBody)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

    const payload = JSON.parse(rawBody);
    if (payload.zen) return NextResponse.json({ message: 'Pong!' }, { status: 200 });

    // ⭐ 1. ЛОГИКА СТАТУСОВ (ОБНОВЛЕНИЕ ПРИ ЗАВЕРШЕНИИ)
    if (eventType === 'workflow_run') {
        const { action, workflow_run } = payload;
        
        // Обрабатываем только завершение
        if (action === 'completed') {
            console.log(`[Webhook] Workflow finished: ${workflow_run.name} -> ${workflow_run.conclusion}`);
            
            // Пытаемся найти ID проекта. При dispatch он часто лежит в payload.workflow_run.inputs
            // Но надежнее, если мы передавали projectName как input
            // @ts-ignore
            const projectName = workflow_run.inputs?.projectName; // Github API v2+

            if (projectName) {
                const isSuccess = workflow_run.conclusion === 'success';
                const newStatus = isSuccess ? 'Активен' : 'Ошибка';
                
                const updates: any = { status: newStatus };
                if (isSuccess) updates.lastDeployed = new Date().toISOString();

                // Обновляем статус в базе
                await db.ref(`projects/${projectName}`).update(updates);
                
                return NextResponse.json({ success: true, project: projectName, status: newStatus });
            }
        }
        return NextResponse.json({ message: 'Workflow processed' });
    }

    // ⭐ 2. ЛОГИКА ЗАПУСКА (PUSH)
    if (eventType === 'push') {
        if (payload.ref !== 'refs/heads/main') {
            return NextResponse.json({ message: 'Not main branch' }, { status: 200 });
        }

        const gitUrl = payload.repository.html_url;
        console.log(`[Webhook] Push received for ${gitUrl}`);

        const projectsRef = db.ref('projects');
        const snapshot = await projectsRef.orderByChild('repoUrl').equalTo(gitUrl).once('value');
        const projects = snapshot.val();

        if (!projects) {
            return NextResponse.json({ message: 'Project not found' }, { status: 404 });
        }

        const octokit = new Octokit({ auth: BUILDER_TOKEN });

        for (const [id, project] of Object.entries(projects) as [string, any][]) {
            if (project.autodeploy === false) continue;

            console.log(`[Webhook] Auto-deploying: ${project.name} (${id})`);
            
            const userRef = db.ref(`users`);
            const usersSnapshot = await userRef.orderByChild('email').equalTo(project.owner).limitToFirst(1).once('value');
            const users = usersSnapshot.val();
            
            if (!users) {
                console.error(`Owner not found for ${id}`);
                continue;
            }
            
            const ownerUid = Object.keys(users)[0];
            const gitToken = users[ownerUid].githubAccessToken;

            await octokit.actions.createWorkflowDispatch({
                owner: process.env.BUILDER_REPO_OWNER || 'kamranezi',
                repo: process.env.BUILDER_REPO_NAME || 'ruvercel-builder',
                workflow_id: 'universal-builder.yml',
                ref: 'main',
                inputs: {
                    gitUrl: gitUrl,
                    projectName: project.id, // Важно передать ID
                    gitToken: gitToken || '',
                    owner: project.owner,
                    envVars: project.envVars ? JSON.stringify(project.envVars) : '[]',
                },
            });
            
            await db.ref(`projects/${id}`).update({ 
                status: 'Сборка',
                lastDeployed: new Date().toISOString()
            });
        }
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
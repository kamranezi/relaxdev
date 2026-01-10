import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { Octokit } from '@octokit/rest';
import crypto from 'crypto';

const BUILDER_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'relaxdev-secret';

// Функция проверки подписи GitHub (безопасность!)
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

    // Читаем тело как текст для проверки подписи
    const rawBody = await req.text();
    
    // Проверка подписи (опционально, но желательно включить)
    // if (!verifySignature(req, rawBody)) {
    //    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const payload = JSON.parse(rawBody);

    // Игнорируем пинги
    if (payload.zen) {
        return NextResponse.json({ message: 'Pong!' }, { status: 200 });
    }
    
    // Проверяем, что это push в ветку main
    if (payload.ref !== 'refs/heads/main') {
        return NextResponse.json({ message: 'Not main branch' }, { status: 200 });
    }

    const gitUrl = payload.repository.html_url;
    console.log(`[Webhook] Push received for ${gitUrl}`);

    // Ищем проекты с таким repoUrl
    const projectsRef = db.ref('projects');
    
    // Используем orderByChild (нужен индекс в database.rules.json: "projects": { ".indexOn": ["repoUrl"] })
    const snapshot = await projectsRef.orderByChild('repoUrl').equalTo(gitUrl).once('value');
    const projects = snapshot.val();

    if (!projects) {
        console.log('[Webhook] No matching projects found.');
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    const octokit = new Octokit({ auth: BUILDER_TOKEN });

    // Проходимся по всем найденным проектам (их может быть несколько с одним репо)
    for (const [id, project] of Object.entries(projects) as [string, any][]) {
        // Проверяем галочку автодеплоя
        if (project.autodeploy === false) { // Учитываем, что undefined = true (по умолчанию)
            console.log(`[Webhook] Skipping ${project.name}: Autodeploy disabled`);
            continue;
        }

        console.log(`[Webhook] Auto-deploying project: ${project.name} (${id})`);
        
        // Получаем токен владельца (нужен для клонирования)
        const userRef = db.ref(`users`);
        // Это не оптимально, лучше хранить uid владельца в проекте. 
        // Но пока ищем по email владельца
        const usersSnapshot = await userRef.orderByChild('email').equalTo(project.owner).limitToFirst(1).once('value');
        const users = usersSnapshot.val();
        
        if (!users) {
            console.error(`[Webhook] Owner not found for project ${id}`);
            continue;
        }
        
        const ownerUid = Object.keys(users)[0];
        const gitToken = users[ownerUid].githubAccessToken;

        // Запускаем билд
        await octokit.actions.createWorkflowDispatch({
            owner: process.env.BUILDER_REPO_OWNER || 'kamranezi',
            repo: process.env.BUILDER_REPO_NAME || 'ruvercel-builder',
            workflow_id: 'universal-builder.yml',
            ref: 'main',
            inputs: {
                gitUrl: gitUrl,
                projectName: project.id,
                gitToken: gitToken || '',
                owner: project.owner,
                envVars: project.envVars ? JSON.stringify(project.envVars) : '',
            },
        });
        
        await db.ref(`projects/${id}`).update({ 
            status: 'Сборка',
            lastDeployed: new Date().toISOString()
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
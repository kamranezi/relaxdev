import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin'; // adminAuth тут не нужен
import { Octokit } from '@octokit/rest';

const BUILDER_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

export async function POST(req: NextRequest) {
  try {
    // 1. ПРОВЕРКА
    if (!db) {
      console.error('Firebase Admin DB not initialized');
      return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
    }

    const payload = await req.json();
    
    // Проверяем, что это push в ветку main
    if (payload.ref !== 'refs/heads/main') {
        return NextResponse.json({ message: 'Not main branch' }, { status: 200 });
    }

    const gitUrl = payload.repository.html_url;
    
    // Теперь TS спокоен насчет db
    const projectsRef = db.ref('projects');
    
    // Внимание: поиск по repoUrl требует правил индексации в Firebase, 
    // но работать будет и без них (просто медленнее и с предупреждением в консоли)
    const snapshot = await projectsRef.orderByChild('repoUrl').equalTo(gitUrl).once('value');
    const projects = snapshot.val();

    if (!projects) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    const octokit = new Octokit({ auth: BUILDER_TOKEN });

    // Проходимся по всем найденным проектам
    for (const [id, project] of Object.entries(projects) as [string, any][]) {
        // Проверяем галочку автодеплоя
        if (!project.autodeploy) {
            console.log(`Skipping ${project.name}: Autodeploy disabled`);
            continue;
        }

        console.log(`Auto-deploying project: ${project.name} (${id})`);
        
        await octokit.actions.createWorkflowDispatch({
            owner: process.env.BUILDER_REPO_OWNER || 'kamranezi',
            repo: process.env.BUILDER_REPO_NAME || 'ruvercel-builder',
            workflow_id: 'universal-builder.yml',
            ref: 'main',
            inputs: {
                gitUrl: gitUrl,
                projectName: project.id,
                gitToken: '',
                owner: project.owner,
                envVars: project.envVars ? JSON.stringify(project.envVars) : '',
            },
        });
        
        await db.ref(`projects/${id}`).update({ status: 'Сборка' });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { listContainers } from '@/lib/yandex';
import { db, adminAuth } from "@/lib/firebase-admin";
import { Project } from '@/types';

export const dynamic = 'force-dynamic';

interface YandexContainer {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  url: string; 
  labels: { [key: string]: string };
}

export async function GET(req: Request) {
  try {
    if (!db || !adminAuth) {
      return NextResponse.json({ error: "Firebase not initialized" }, { status: 500 });
    }

    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    let currentUserEmail: string | null = null;
    let isAdmin = false;

    if (idToken) {
        try {
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            currentUserEmail = decodedToken.email || null;
            const adminRef = db.ref(`admins/${decodedToken.uid}`);
            isAdmin = (await adminRef.once('value')).val() === true;
        } catch (e) {
            console.warn("Auth warning:", e);
        }
    }

    const projectsRef = db.ref('projects');
    const allProjects = (await projectsRef.once('value')).val() || {};

    const folderId = process.env.YC_FOLDER_ID;
    const containersMap: Record<string, YandexContainer> = {};
    
    if (folderId) {
      try {
        const containersData = await listContainers(folderId);
        // @ts-ignore
        const containers = (containersData.containers || []) as YandexContainer[];
        containers.forEach((c) => {
          containersMap[c.name] = c;
        });
      } catch (error) {
        console.error('Yandex Error:', error);
      }
    }

    const projects = Object.entries(allProjects)
      .map(([key, value]) => ({ ...(value as object), id: key } as Project))
      .filter((project) => {
        if (isAdmin) return true;
        if (currentUserEmail) {
          return project.owner === currentUserEmail || project.isPublic === true;
        }
        return project.isPublic === true;
      })
      .map((project) => {
        const container = containersMap[project.id];
        let status = project.status || 'Сборка';

        if (container) {
          if (container.status === 'ACTIVE') status = 'Активен';
          else if (container.status === 'ERROR' || container.status === 'STOPPED') status = 'Ошибка';
        }

        return {
          ...project,
          status,
          domain: container?.url || project.domain || '',
        };
      })
      .sort((a, b) => new Date(b.lastDeployed || 0).getTime() - new Date(a.lastDeployed || 0).getTime());

    return NextResponse.json(projects);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
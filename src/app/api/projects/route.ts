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
      console.error("Firebase Admin SDK not initialized");
      return NextResponse.json(
          { error: "Internal Server Error: Firebase not initialized." },
          { status: 500 }
      );
    }

    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    let currentUserEmail: string | null = null;
    let isAdmin = false;

    if (idToken) {
        try {
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            const uid = decodedToken.uid;
            const user = await adminAuth.getUser(uid);
            currentUserEmail = user.email!;

            const adminRef = db.ref(`admins/${uid}`);
            const adminSnapshot = await adminRef.once('value');
            isAdmin = adminSnapshot.val() === true;
        } catch (error) {
            console.warn("Invalid auth token, treating as unauthenticated.", error);
        }
    }

    const projectsRef = db.ref('projects');
    const projectsSnapshot = await projectsRef.once('value');
    const allProjects = projectsSnapshot.val() || {};

    const folderId = process.env.YC_FOLDER_ID;
    const containersMap: Record<string, YandexContainer> = {};
    
    if (folderId) {
      try {
        const containersData = await listContainers(folderId);
        const containers = (containersData.containers || []) as YandexContainer[];
        containers.forEach((c: YandexContainer) => {
          containersMap[c.name] = c;
        });
      } catch (error) {
        console.error('Ошибка получения контейнеров из Yandex:', error);
      }
    }

    const projects: Project[] = (Object.entries(allProjects) as [string, Project][])
      .filter(([key, project]: [string, Project]) => {
        if (isAdmin) return true;
        if (currentUserEmail) {
          return project.owner === currentUserEmail || project.isPublic;
        }
        return project.isPublic;
      })
      .map(([key, project]: [string, Project]) => {
        const container = containersMap[key];
        
        let status = project.status || 'Сборка';
        if (container) {
          if (container.status === 'ACTIVE') {
            status = 'Активен';
          } else if (container.status === 'ERROR' || container.status === 'STOPPED') {
            status = 'Ошибка';
          }
        }

        return {
          id: project.id || key,
          name: project.name || key,
          status: status,
          repoUrl: project.repoUrl || '',
          lastDeployed: project.lastDeployed || project.updatedAt || project.createdAt || '',
          targetImage: project.targetImage || '',
          domain: container?.url || project.domain || '',
          owner: project.owner || '',
          isPublic: project.isPublic || false,
          envVars: project.envVars || [],
          buildErrors: project.buildErrors || [],
          missingEnvVars: project.missingEnvVars || [],
          deploymentLogs: project.deploymentLogs || '',
          createdAt: project.createdAt || '',
          updatedAt: project.updatedAt || '',
        } as Project;
      })
      .sort((a, b) => {
        return new Date(b.lastDeployed || b.updatedAt || 0).getTime() - 
               new Date(a.lastDeployed || a.updatedAt || 0).getTime();
      });

    return NextResponse.json(projects);

  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to list projects';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// src/lib/yandex.ts

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getIAMToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  if (process.env.NODE_ENV !== 'production' && !process.env.YC_IAM_TOKEN) {
    console.warn('⚠️ Running in development mode without YC_IAM_TOKEN');
    return '';
  }

  try {
    const response = await fetch(
      'http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token',
      {
        headers: { 'Metadata-Flavor': 'Google' },
        signal: AbortSignal.timeout(3000),
      }
    );

    if (!response.ok) {
      throw new Error(`Metadata service error: ${response.status}`);
    }

    const data = await response.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + 11 * 60 * 60 * 1000,
    };

    return data.access_token;
  } catch (error) {
    console.warn('Failed to get IAM token from metadata:', error);
    const fallbackToken = process.env.YC_IAM_TOKEN;
    if (fallbackToken) return fallbackToken;
    throw new Error('No IAM token available. Set YC_IAM_TOKEN env variable for local development.');
  }
}

// --- API Контейнеров (Serverless Containers) ---

export async function listContainers(folderId: string) {
  if (!folderId) throw new Error('Folder ID is required');
  const token = await getIAMToken();
  if (!token) throw new Error('No IAM token found');

  const response = await fetch(
    `https://serverless-containers.api.cloud.yandex.net/containers/v1/containers?folderId=${folderId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Yandex API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function getContainerByName(name: string) {
    try {
        const folderId = process.env.YC_FOLDER_ID;
        if (!folderId) return null;
        const data = await listContainers(folderId);
        // @ts-ignore
        const containers = data.containers || [];
        return containers.find((c: any) => c.name === name) || null;
    } catch (e) {
        console.error('getContainerByName error:', e);
        return null;
    }
}

export async function deleteContainer(containerId: string) {
  const token = await getIAMToken();
  if (!token) throw new Error('No IAM token found');

  const response = await fetch(
    `https://serverless-containers.api.cloud.yandex.net/containers/v1/containers/${containerId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to delete container: ${response.status} - ${errorText}`);
  }
  return true;
}

// --- API Реестра (Container Registry) ---
// ⭐ НОВЫЕ ФУНКЦИИ ДЛЯ УДАЛЕНИЯ ОБРАЗОВ

export async function deleteRepository(repositoryId: string) {
  const token = await getIAMToken();
  const response = await fetch(
    `https://container-registry.api.cloud.yandex.net/container-registry/v1/repositories/${repositoryId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  if (!response.ok && response.status !== 404) {
      console.error(`Failed to delete repository ${repositoryId}: ${response.status}`);
  }
}

export async function deleteProjectRegistry(projectName: string) {
    const registryId = process.env.YC_REGISTRY_ID;
    if (!registryId) {
        console.warn('YC_REGISTRY_ID not set, skipping registry cleanup');
        return;
    }

    try {
        const token = await getIAMToken();
        // 1. Получаем список репозиториев в реестре
        const listRes = await fetch(
            `https://container-registry.api.cloud.yandex.net/container-registry/v1/repositories?registryId=${registryId}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (!listRes.ok) {
            console.error('Failed to list repositories');
            return;
        }
        
        const data = await listRes.json();
        const repos = data.repositories || [];
        
        // 2. Ищем репозиторий, имя которого совпадает с именем проекта
        const repo = repos.find((r: any) => r.name === projectName);
        
        if (repo) {
            console.log(`Deleting registry repository: ${repo.name} (${repo.id})`);
            // 3. Удаляем репозиторий (это удалит и все образы внутри)
            await deleteRepository(repo.id);
        } else {
            console.log(`Registry repository for ${projectName} not found.`);
        }
    } catch (e) {
        console.error('Error cleaning up registry:', e);
    }
}
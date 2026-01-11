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

    if (!response.ok) throw new Error(`Metadata service error: ${response.status}`);

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

// --- КОНТЕЙНЕРЫ (RUNTIME) ---

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

// ⭐ НОВАЯ ФУНКЦИЯ: Деплой ревизии (для отката версий)
export async function deployRevision(containerId: string, imageUri: string, serviceAccountId: string, envVars: Record<string, string>) {
    const token = await getIAMToken();
    
    const body: any = {
        containerId,
        image: imageUri,
        resources: { cores: "1", memory: "1073741824" }, // 1GB (как в workflow)
        serviceAccountId,
        executionTimeout: "60s"
    };

    if (Object.keys(envVars).length > 0) {
        body.environment = envVars;
    }

    const response = await fetch(
        `https://serverless-containers.api.cloud.yandex.net/containers/v1/containers/${containerId}:deployRevision`,
        {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        }
    );

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Deploy revision failed: ${text}`);
    }
    return response.json();
}

// --- УДАЛЕНИЕ ИЗ РЕЕСТРА (ПОЛНОЕ) ---

// 1. Удаление конкретного образа по ID
async function deleteImage(imageId: string) {
    const token = await getIAMToken();
    const response = await fetch(
        `https://container-registry.api.cloud.yandex.net/container-registry/v1/images/${imageId}`,
        {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        }
    );
    if (!response.ok && response.status !== 404) {
        console.error(`Failed to delete image ${imageId}: ${response.status}`);
    } else {
        console.log(`Deleted image: ${imageId}`);
    }
}

// 2. Получение списка образов в репозитории
async function listImages(repositoryId: string) {
    const token = await getIAMToken();
    const response = await fetch(
        `https://container-registry.api.cloud.yandex.net/container-registry/v1/images?repositoryId=${repositoryId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.images || [];
}

// 3. Удаление самой папки репозитория
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
  } else {
      console.log(`Deleted repository: ${repositoryId}`);
  }
}

// ⭐ НОВАЯ ФУНКЦИЯ: Получение ВСЕХ репозиториев (с пагинацией)
async function listAllRepositories(registryId: string, token: string) {
    let repos: any[] = [];
    let pageToken = '';
    
    do {
        const res = await fetch(
            `https://container-registry.api.cloud.yandex.net/container-registry/v1/repositories?registryId=${registryId}&pageToken=${pageToken}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (!res.ok) {
            console.error(`Failed to list repositories: ${res.status}`);
            break;
        }
        const data: any = await res.json();
        if (data.repositories) {
            repos = repos.concat(data.repositories);
        }
        pageToken = data.nextPageToken || '';
    } while (pageToken);
    
    return repos;
}

// ⭐ ГЛАВНАЯ ФУНКЦИЯ ОЧИСТКИ (ИСПРАВЛЕННАЯ С ПАГИНАЦИЕЙ)
export async function deleteProjectRegistry(projectName: string) {
    const registryId = process.env.YC_REGISTRY_ID;
    if (!registryId) {
        console.warn('YC_REGISTRY_ID not set, skipping registry cleanup');
        return;
    }
    try {
        const token = await getIAMToken();
        
        console.log(`Searching for repo "${projectName}" in registry...`);
        
        // 1. Ищем репозиторий с учетом пагинации (чтобы найти, даже если их > 100)
        const repos = await listAllRepositories(registryId, token);
        
        console.log(`Total repos found: ${repos.length}`);

        // Поиск с учетом разных форматов имен
        const repo = repos.find((r: any) => 
            r.name === projectName || 
            r.name.endsWith('/' + projectName)
        );
        
        if (repo) {
            console.log(`Found repository: ${repo.name} (ID: ${repo.id}). Cleaning up...`);
            
            // 2. Сначала удаляем ВСЕ образы внутри
            const images = await listImages(repo.id);
            if (images.length > 0) {
                console.log(`Deleting ${images.length} images from ${repo.name}...`);
                await Promise.allSettled(images.map((img: any) => deleteImage(img.id)));
            } else {
                console.log('No images found inside repository.');
            }

            // 3. Теперь удаляем пустой репозиторий
            console.log(`Deleting repository folder...`);
            await deleteRepository(repo.id);
            console.log(`Registry cleanup for ${projectName} complete.`);
        } else {
            // Вывод списка для отладки (только имена)
            console.warn(`Repository for "${projectName}" NOT FOUND. Available:`, repos.map((r: any) => r.name).join(', '));
        }
    } catch (e) {
        console.error('Error cleaning up registry:', e);
    }
}
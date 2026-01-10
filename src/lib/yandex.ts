// src/lib/yandex.ts

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getIAMToken(): Promise<string> {
  // ... (Ваш существующий код без изменений) ...
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

export async function listContainers(folderId: string) {
  // ... (Ваш существующий код) ...
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
    // ... (Ваш существующий код) ...
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

// ⭐ НОВАЯ ФУНКЦИЯ: Удаление контейнера
export async function deleteContainer(containerId: string) {
  const token = await getIAMToken();
  if (!token) throw new Error('No IAM token found');

  console.log(`Attempting to delete Yandex container: ${containerId}`);

  const response = await fetch(
    `https://serverless-containers.api.cloud.yandex.net/containers/v1/containers/${containerId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    // Если контейнер уже не найден (404), считаем это успехом
    if (response.status === 404) return true;
    throw new Error(`Failed to delete container: ${response.status} - ${errorText}`);
  }

  return response.json();
}
// src/lib/yandex.ts
export async function getIAMToken() {
  // Если мы локально (dev), нужен токен вручную. 
  // Внутри облака получаем его из метаданных AWS-style
  try {
    const response = await fetch('http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token', {
      headers: { 'Metadata-Flavor': 'Google' },
    });
    const data = await response.json();
    return data.access_token;
  } catch {
    console.warn('Не удалось получить IAM токен из метаданных. Вы локально?');
    return process.env.YC_IAM_TOKEN || ''; // Fallback для локальной разработки
  }
}

export async function listContainers(folderId: string) {
  const token = await getIAMToken();
  if (!token) throw new Error('No IAM token found');

  const response = await fetch(`https://serverless-containers.api.cloud.yandex.net/containers/v1/containers?folderId=${folderId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Yandex API Error: ${response.statusText}`);
  }

  return response.json();
}
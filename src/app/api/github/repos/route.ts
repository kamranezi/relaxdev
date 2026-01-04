import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { Octokit } from "@octokit/rest";
import { authOptions } from "../../auth/[...nextauth]/route"; // <--- ВАЖНО: Импортируем authOptions

// Эта строка нужна, чтобы Next.js не кешировал ответ, 
// так как список репозиториев может меняться
export const dynamic = 'force-dynamic';

export async function GET() {
  // 1. Получаем сессию (токен пользователя)
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Инициализируем GitHub клиент с токеном ПОЛЬЗОВАТЕЛЯ
    // Это позволяет видеть приватные репозитории конкретного юзера
    const octokit = new Octokit({
      auth: session.accessToken,
    });

    // 3. Запрашиваем репозитории (свои + доступные)
    // sort: 'updated' — чтобы сверху были те, над которыми работали недавно
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
      visibility: 'all',
    });

    // 4. Оставляем только нужные поля для фронтенда
    const repos = data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name, // например "kamranezi/my-project"
      url: repo.clone_url,      // ссылка для клонирования
      private: repo.private,    // true/false
      updated_at: repo.updated_at,
    }));

    return NextResponse.json(repos);

  } catch (error) {
    console.error('GitHub API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch repositories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host');

  // Проверяем, если заход с www
  if (host?.startsWith('www.')) {
    // Создаем новый URL вручную, чтобы избежать добавления порта
    const newUrl = `https://relaxdev.ru${request.nextUrl.pathname}${request.nextUrl.search}`;
    
    // Выполняем постоянный редирект
    return NextResponse.redirect(newUrl, 301);
  }

  return NextResponse.next();
}

// Применяем middleware ко всем путям, кроме служебных файлов Next.js
export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};

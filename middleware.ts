import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host');

  // Проверяем, если заход с www
  if (host?.startsWith('www.')) {
    const newUrl = new URL(request.url);
    newUrl.host = 'relaxdev.ru'; // Убираем www
    newUrl.protocol = 'https';
    
    return NextResponse.redirect(newUrl, 301);
  }

  return NextResponse.next();
}

// Применяем ко всем путям
export const config = {
  matcher: '/:path*',
};
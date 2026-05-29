import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'packprint_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  // 1. Nếu cố gắng truy cập dashboard mà chưa đăng nhập -> chuyển hướng về /login
  if (pathname.startsWith('/dashboard')) {
    if (!sessionCookie || !sessionCookie.value) {
      const loginUrl = new URL('/login', request.url);
      // Lưu lại trang đích để sau khi đăng nhập thành công có thể quay lại (nếu cần)
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Nếu đã đăng nhập mà cố gắng truy cập trang login hoặc trang chủ gốc -> chuyển hướng sang /dashboard
  if (pathname === '/login' || pathname === '/') {
    if (sessionCookie && sessionCookie.value) {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // 3. Nếu truy cập trang chủ gốc '/' mà chưa đăng nhập -> chuyển hướng sang /login
  if (pathname === '/') {
    if (!sessionCookie || !sessionCookie.value) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Cấu hình các route mà Middleware sẽ áp dụng
export const config = {
  matcher: [
    /*
     * Áp dụng Middleware cho toàn bộ các route ngoại trừ:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, logo.png (public assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.pdf).*)',
  ],
};

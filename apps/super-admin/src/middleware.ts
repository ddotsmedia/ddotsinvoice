import { NextResponse, type NextRequest } from 'next/server';

// Access token lives in memory; the httpOnly refresh_token cookie gates the console.
// Role (super_admin) is enforced client-side in the (dashboard) layout via /auth/me.
export function middleware(req: NextRequest) {
  if (!req.cookies.has('refresh_token')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/', '/tenants/:path*', '/companies', '/users', '/settings'] };

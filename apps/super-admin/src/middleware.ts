import { NextResponse, type NextRequest } from 'next/server';

const SUPER_ADMIN_ROLES = new Set(['super_admin', 'platform_admin']);

// URL of the main web app — override via NEXT_PUBLIC_WEB_URL env var
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

export function middleware(req: NextRequest) {
  if (!req.cookies.has('refresh_token')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect non-super-admin users back to the main app.
  // Not a security boundary — real authz is enforced server-side.
  const role = req.cookies.get('user_role')?.value ?? '';
  if (role && !SUPER_ADMIN_ROLES.has(role)) {
    return NextResponse.redirect(WEB_URL + '/dashboard');
  }

  return NextResponse.next();
}

export const config = { matcher: ['/', '/tenants/:path*', '/companies', '/users', '/settings'] };

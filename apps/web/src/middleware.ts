import { NextResponse, type NextRequest } from 'next/server';

// Roles that belong in the super-admin console (separate app)
const SUPER_ADMIN_ROLES = new Set(['super_admin', 'platform_admin']);

// Roles that have access to admin routes within this app
const ADMIN_ROLES = new Set(['tenant_admin', 'company_admin', 'branch_manager']);

// URL of the super-admin app — override via NEXT_PUBLIC_SUPER_ADMIN_URL env var
// In production this is served behind a reverse proxy (e.g. /superadmin or a subdomain).
const SUPER_ADMIN_URL = process.env.NEXT_PUBLIC_SUPER_ADMIN_URL || 'http://localhost:4200';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Require a session cookie — gate the entire /dashboard tree
  if (!req.cookies.has('refresh_token')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2. Read the non-httpOnly role cookie set by the API on login/refresh.
  //    This is NOT a security boundary — real authz is enforced by the API via JWT + RLS.
  //    It is only used to redirect users to the right portal on first load.
  const role = req.cookies.get('user_role')?.value ?? '';

  // 3. Super admins / platform admins should not be using this app at all.
  //    Redirect them to the super-admin console.
  if (SUPER_ADMIN_ROLES.has(role)) {
    return NextResponse.redirect(SUPER_ADMIN_URL);
  }

  // 4. Regular (non-admin) users must not access admin-only routes.
  if (pathname.startsWith('/dashboard/admin') && !ADMIN_ROLES.has(role)) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // 5. Admin users landing on the plain /dashboard root get sent to their admin home.
  if (pathname === '/dashboard' && ADMIN_ROLES.has(role)) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard/admin';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*'] };

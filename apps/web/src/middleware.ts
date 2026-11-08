import { NextResponse, type NextRequest } from 'next/server';

// Access token lives in memory; the httpOnly refresh_token cookie gates the dashboard.
export function middleware(req: NextRequest) {
  if (!req.cookies.has('refresh_token')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*'] };

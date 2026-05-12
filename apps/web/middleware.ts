import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BLOG_PUBLIC_URL = (process.env.NEXT_PUBLIC_BLOG_URL ?? 'https://blog.forceweaver.com').replace(
  /\/$/,
  ''
);

function parseHostList(value: string | undefined, fallback: string): Set<string> {
  return new Set(
    (value ?? fallback)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

const APEX_HOSTS = parseHostList(process.env.APEX_HOSTS, 'forceweaver.com,www.forceweaver.com');
const BLOG_HOSTS = parseHostList(process.env.BLOG_HOSTS, 'blog.forceweaver.com');

function isAssetOrNext(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/ingest') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    /\.[a-zA-Z0-9]{2,8}$/.test(pathname)
  );
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0] ?? '';
  const { pathname } = request.nextUrl;

  if (isAssetOrNext(pathname)) {
    return NextResponse.next();
  }

  const isLocal =
    host === 'localhost' || host.endsWith('.localhost') || host.startsWith('127.') || host.includes('localhost');

  // Production / preview hosts only (skip middleware logic on local dev for simpler /blog testing)
  if (!isLocal) {
    if (APEX_HOSTS.has(host)) {
      if (pathname === '/blog' || pathname.startsWith('/blog/')) {
        const rest =
          pathname === '/blog' ? '' : pathname.slice('/blog/'.length).replace(/\/$/, '');
        const target = rest ? `${BLOG_PUBLIC_URL}/${rest}` : `${BLOG_PUBLIC_URL}/`;
        return NextResponse.redirect(target, 301);
      }
    }

    if (BLOG_HOSTS.has(host)) {
      if (pathname === '/blog') {
        return NextResponse.redirect(new URL('/', request.url), 301);
      }
      if (pathname.startsWith('/blog/')) {
        const rest = pathname.slice('/blog/'.length);
        return NextResponse.redirect(new URL(`/${rest}`, request.url), 301);
      }
      if (pathname === '/') {
        return NextResponse.rewrite(new URL('/blog', request.url));
      }
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length === 1) {
        const seg = segments[0];
        if (seg === 'cookie-policy') {
          return NextResponse.rewrite(new URL('/cookie-policy', request.url));
        }
        return NextResponse.rewrite(new URL(`/blog/${seg}`, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};

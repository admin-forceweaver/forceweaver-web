export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://forceweaver.com').replace(/\/$/, '');
}

export function blogOrigin(): string {
  return (process.env.NEXT_PUBLIC_BLOG_URL ?? 'https://blog.forceweaver.com').replace(/\/$/, '');
}

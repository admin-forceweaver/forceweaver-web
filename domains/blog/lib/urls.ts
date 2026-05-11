/** Canonical blog site origin (no trailing slash). */
export function blogOrigin(): string {
  return (process.env.NEXT_PUBLIC_BLOG_URL ?? 'https://blog.forceweaver.com').replace(/\/$/, '');
}

/** Public URL for a single post on the blog host (clean path: /slug). */
export function blogPostUrl(slug: string): string {
  return `${blogOrigin()}/${encodeURIComponent(slug)}`;
}

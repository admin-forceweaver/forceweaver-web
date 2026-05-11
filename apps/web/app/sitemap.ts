import type { MetadataRoute } from 'next';
import { getAllPostSlugs } from '@domains/blog/lib/blog';
import { blogOrigin, siteOrigin } from '@/lib/site';

export async function generateSitemaps() {
  return [{ id: 0 }, { id: 1 }];
}

export default async function sitemap(props: { id: number }): Promise<MetadataRoute.Sitemap> {
  const apex = siteOrigin();
  const blog = blogOrigin();

  if (props.id === 0) {
    return [
      { url: apex, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
      { url: `${apex}/cookie-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
      { url: blog, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    ];
  }

  const slugs = getAllPostSlugs();
  const entries: MetadataRoute.Sitemap = slugs.map((slug: string) => ({
    url: `${blog}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));
  return [{ url: `${blog}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 }, ...entries];
}

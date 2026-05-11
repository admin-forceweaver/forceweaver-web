import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllPostSlugs, getPostBySlug } from '@domains/blog/lib/blog';
import { generateMetadata as buildMeta, generateArticleSchema } from '@/lib/seo';
import { blogOrigin, siteOrigin } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return { title: 'Not found' };
  }
  const canonical = `${blogOrigin()}/${slug}`;
  return buildMeta({
    title: post.title,
    description: post.excerpt || post.title,
    canonical,
    ogType: 'article',
    ogImage: post.featuredImage,
    article: {
      publishedTime: post.date,
      author: post.author,
      tags: post.tags,
    },
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const canonical = `${blogOrigin()}/${slug}`;
  const articleJsonLd = generateArticleSchema({
    title: post.title,
    description: post.excerpt,
    image: post.featuredImage,
    datePublished: post.date,
    author: post.author,
    url: canonical,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <article className="container mx-auto px-6 py-12 max-w-3xl">
        <p className="text-sm text-indigo-dye/60 mb-6">
          <Link href={`${siteOrigin()}/`} className="hover:text-celestial-blue">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href={`${blogOrigin()}/`} className="hover:text-celestial-blue">
            Blog
          </Link>
          <span className="mx-2">/</span>
          <span className="text-indigo-dye">{post.title}</span>
        </p>
        <header className="mb-10">
          <p className="text-sm text-celestial-blue font-semibold mb-2">{post.category}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-indigo-dye leading-tight">{post.title}</h1>
          <p className="mt-4 text-indigo-dye/70">
            {post.author} · {new Date(post.date).toLocaleDateString('en-US', { dateStyle: 'long' })} ·{' '}
            {post.readingTime} min read
          </p>
        </header>
        {post.featuredImage && (
          <div className="relative w-full h-64 md:h-80 mb-10 rounded-xl overflow-hidden bg-gray-100">
            <Image src={post.featuredImage} alt={post.title} fill className="object-cover" priority />
          </div>
        )}
        <div
          className="prose prose-lg max-w-none prose-headings:text-indigo-dye prose-a:text-celestial-blue"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </>
  );
}

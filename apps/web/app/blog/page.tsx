import { getAllCategories, getAllPosts } from '@domains/blog/lib/blog';
import BlogList from '@/app/blog/BlogList';
import { generateMetadata as buildMeta } from '@/lib/seo';
import { blogOrigin } from '@/lib/site';

export const metadata = buildMeta({
  title: 'Blog',
  description: 'Articles on Salesforce Revenue Cloud, billing, CPQ, and ForceWeaver product updates.',
  canonical: `${blogOrigin()}/`,
});

export default function BlogIndexPage() {
  const allPosts = getAllPosts();
  const categories = ['All', ...getAllCategories()];

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white">
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-6 text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-extrabold text-indigo-dye">ForceWeaver Blog</h1>
          <p className="mt-4 text-lg text-indigo-dye/80">
            Deep dives, patterns, and lessons learned from Revenue Cloud work in the field.
          </p>
        </div>
      </section>
      <BlogList allPosts={allPosts} categories={categories} />
    </div>
  );
}

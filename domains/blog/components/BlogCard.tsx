import Image from 'next/image';
import type { BlogPostMetadata } from '../lib/blog';
import { blogPostUrl } from '../lib/urls';

interface BlogCardProps {
  post: BlogPostMetadata;
}

export default function BlogCard({ post }: BlogCardProps) {
  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const href = blogPostUrl(post.slug);

  return (
    <a href={href} className="block h-full">
      <article className="glass-card p-6 rounded-lg hover:shadow-xl transition-shadow cursor-pointer h-full flex flex-col">
        {post.featuredImage && (
          <div className="mb-4 rounded-lg overflow-hidden bg-gray-200 h-48 relative">
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <span className="badge-purple text-xs">{post.category}</span>
          <span className="text-sm text-gray-500">{post.readingTime} min read</span>
        </div>

        <h2 className="text-2xl font-bold text-indigo-dye mb-3 hover:text-celestial-blue transition-colors">
          {post.title}
        </h2>

        <p className="text-gray-600 mb-4 line-clamp-3 flex-grow">{post.excerpt}</p>

        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
          <span>{post.author}</span>
          <span>{formattedDate}</span>
        </div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {post.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </article>
    </a>
  );
}

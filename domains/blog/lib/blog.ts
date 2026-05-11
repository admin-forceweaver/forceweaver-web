import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

// When imported by apps/web, process.cwd() will be apps/web/
// So we need to go up and into domains/blog/content/posts
const postsDirectory = path.join(process.cwd(), '..', '..', 'domains', 'blog', 'content', 'posts');
const publicImagesDirectory = path.join(process.cwd(), 'public', 'blog', 'images');

const IMAGE_EXTENSIONS = new Set(['.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg']);

function copyImageFilesRecursive(sourceDir: string, targetRoot: string, relativeBase = ''): void {
  if (!fs.existsSync(sourceDir)) return;
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = path.join(relativeBase, entry.name);
    const sourcePath = path.join(sourceDir, entry.name);
    if (entry.isDirectory()) {
      copyImageFilesRecursive(sourcePath, targetRoot, rel);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) continue;
    const targetPath = path.join(targetRoot, rel);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
}

// Copy images from post folder (including subfolders like `images/`) to public/blog/images/{slug}/
function copyPostImages(slug: string): void {
  try {
    const postFolder = path.join(postsDirectory, slug);
    const targetFolder = path.join(publicImagesDirectory, slug);
    if (!fs.existsSync(postFolder)) return;
    fs.mkdirSync(targetFolder, { recursive: true });
    copyImageFilesRecursive(postFolder, targetFolder);
  } catch (error) {
    console.warn(`Could not copy images for post ${slug}:`, error);
  }
}

// Helper function to transform relative image paths to absolute paths
function transformImagePaths(content: string, slug: string): string {
  // Replace relative image paths with absolute paths
  // Matches: ![alt text](image.webp) or ![alt text](./image.webp)
  return content.replace(
    /!\[([^\]]*)\]\((?!http)(?!\/)(\.\/)?([^)]+)\)/g,
    (match, altText, optional, filename) => {
      return `![${altText}](/blog/images/${slug}/${filename})`;
    }
  );
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  content: string;
  tags: string[];
  category: string;
  featuredImage?: string;
  readingTime: number;
}

export interface BlogPostMetadata {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
  category: string;
  featuredImage?: string;
  readingTime: number;
  published: boolean;
}

// Calculate reading time (average 200 words per minute)
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

function listPostSlugsOnDisk(): string[] {
  try {
    const entries = fs.readdirSync(postsDirectory, { withFileTypes: true });
    return entries
      .filter((entry) => {
        if (entry.isDirectory()) {
          const indexPath = path.join(postsDirectory, entry.name, 'index.md');
          return fs.existsSync(indexPath);
        }
        return false;
      })
      .map((entry) => entry.name)
      .filter((name) => name !== 'README.md');
  } catch {
    console.warn('Blog directory not found, returning empty array');
    return [];
  }
}

/** Published post slugs only (for sitemaps and static generation). */
export function getAllPostSlugs(): string[] {
  return getAllPosts().map((p) => p.slug);
}

// Get all posts metadata (for listing page)
export function getAllPosts(): BlogPostMetadata[] {
  try {
    const slugs = listPostSlugsOnDisk();
    const posts = slugs
      .map(slug => {
        // Copy images to public directory
        copyPostImages(slug);
        
        const fullPath = path.join(postsDirectory, slug, 'index.md');
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const { data, content } = matter(fileContents);

        // Transform relative featured image path to absolute
        let featuredImage = data.featuredImage;
        if (featuredImage && !featuredImage.startsWith('http') && !featuredImage.startsWith('/')) {
          featuredImage = `/blog/images/${slug}/${featuredImage}`;
        }

        return {
          slug,
          title: data.title || 'Untitled',
          date: data.date || new Date().toISOString(),
          author: data.author || 'Forceweaver Team',
          excerpt: data.excerpt || '',
          tags: data.tags || [],
          category: data.category || 'General',
          featuredImage,
          readingTime: calculateReadingTime(content),
          published: data.published !== false,
        } as BlogPostMetadata;
      })
      .filter(post => post.published)
      .sort((a, b) => (a.date > b.date ? -1 : 1));

    return posts;
  } catch {
    console.warn('Error reading blog posts');
    return [];
  }
}

// Get single post by slug
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    // Copy images to public directory
    copyPostImages(slug);
    
    const fullPath = path.join(postsDirectory, slug, 'index.md');
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    if (data.published === false) {
      return null;
    }

    // Transform relative image paths in content to absolute paths
    const contentWithAbsolutePaths = transformImagePaths(content, slug);

    // Convert markdown to HTML with syntax highlighting
    const processedContent = await remark()
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeHighlight)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(contentWithAbsolutePaths);
    const contentHtml = processedContent.toString();

    // Transform relative featured image path to absolute
    let featuredImage = data.featuredImage;
    if (featuredImage && !featuredImage.startsWith('http') && !featuredImage.startsWith('/')) {
      featuredImage = `/blog/images/${slug}/${featuredImage}`;
    }

    return {
      slug,
      title: data.title || 'Untitled',
      date: data.date || new Date().toISOString(),
      author: data.author || 'Forceweaver Team',
      excerpt: data.excerpt || '',
      content: contentHtml,
      tags: data.tags || [],
      category: data.category || 'General',
      featuredImage,
      readingTime: calculateReadingTime(content),
    };
  } catch (error) {
    console.error(`Error reading blog post ${slug}:`, error);
    return null;
  }
}

// Get posts by category
export function getPostsByCategory(category: string): BlogPostMetadata[] {
  const allPosts = getAllPosts();
  return allPosts.filter(post => 
    post.category.toLowerCase() === category.toLowerCase()
  );
}

// Get posts by tag
export function getPostsByTag(tag: string): BlogPostMetadata[] {
  const allPosts = getAllPosts();
  return allPosts.filter(post => 
    post.tags.some(t => t.toLowerCase() === tag.toLowerCase())
  );
}

// Get all unique categories
export function getAllCategories(): string[] {
  const allPosts = getAllPosts();
  const categories = allPosts.map(post => post.category);
  return Array.from(new Set(categories));
}

// Get all unique tags
export function getAllTags(): string[] {
  const allPosts = getAllPosts();
  const tags = allPosts.flatMap(post => post.tags);
  return Array.from(new Set(tags));
}


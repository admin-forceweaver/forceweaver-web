#!/usr/bin/env node
/**
 * Copies WordPress-exported posts from output/posts into domains/blog/content/posts,
 * normalizes frontmatter for ForceWeaver, and fixes image paths / alt text.
 *
 * Usage (repo root): node scripts/import-wordpress-posts.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const require = createRequire(import.meta.url);
function loadMatter() {
  const candidates = [
    path.join(root, 'node_modules', 'gray-matter'),
    path.join(root, 'apps', 'web', 'node_modules', 'gray-matter'),
  ];
  for (const p of candidates) {
    try {
      return require(p);
    } catch {
      /* try next */
    }
  }
  throw new Error('gray-matter not found; run npm install from repo root');
}
const matter = loadMatter();

const SRC = path.join(root, 'output', 'posts');
const DEST = path.join(root, 'domains', 'blog', 'content', 'posts');

const CATEGORY_MAP = {
  concepts: 'Development',
  recipes: 'Tutorial',
  news: 'Announcements',
  announcements: 'Announcements',
};

function stripLeadingDateFromSlug(slug) {
  return String(slug).replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

function formatDate(d) {
  if (!d) return new Date().toISOString().slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  if (typeof d === 'string') return d.length >= 10 ? d.slice(0, 10) : d;
  return String(d).slice(0, 10);
}

function pickCategory(categories) {
  if (!categories || !categories.length) return 'General';
  const lowered = categories.map((c) =>
    String(c)
      .toLowerCase()
      .replace(/"/g, '')
      .trim()
  );
  if (lowered.includes('recipes')) return CATEGORY_MAP.recipes;
  if (lowered.includes('concepts')) return CATEGORY_MAP.concepts;
  const raw = lowered[0];
  return CATEGORY_MAP[raw] || raw.charAt(0).toUpperCase() + raw.slice(1);
}

function normalizeTags(tags) {
  if (!tags) return [];
  const arr = Array.isArray(tags) ? tags : [tags];
  return arr.map((t) => String(t).replace(/^["']|["']$/g, '').trim()).filter(Boolean);
}

function findFeaturedRelative(slugDir, coverImage) {
  if (!coverImage || typeof coverImage !== 'string') return undefined;
  const name = coverImage.trim().replace(/^\.\//, '');
  const direct = path.join(slugDir, name);
  const underImages = path.join(slugDir, 'images', path.basename(name));
  if (fs.existsSync(direct) && !fs.statSync(direct).isDirectory()) {
    return name.split(path.sep).join('/');
  }
  if (fs.existsSync(underImages)) {
    return path.join('images', path.basename(name)).split(path.sep).join('/');
  }
  const imagesDir = path.join(slugDir, 'images');
  if (fs.existsSync(imagesDir)) {
    const files = fs.readdirSync(imagesDir);
    const base = path.basename(name);
    const hit = files.find((f) => f === base || f.toLowerCase() === base.toLowerCase());
    if (hit) return `images/${hit}`;
  }
  if (name.startsWith('images/')) return name.split(path.sep).join('/');
  return `images/${path.basename(name)}`;
}

function excerptFromContent(body) {
  const stripped = body
    .replace(/\r\n/g, '\n')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+.+$/gm, ' ')
    .replace(/[*_~`#>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const slice = stripped.slice(0, 260);
  const lastPeriod = slice.lastIndexOf('.');
  const cut = lastPeriod >= 120 ? slice.slice(0, lastPeriod + 1) : slice;
  const out = cut.trim();
  if (out.length <= 220) return out;
  return out.slice(0, 217).trimEnd() + '…';
}

function normalizeMarkdownBody(body) {
  let s = body.replace(/\r\n/g, '\n');
  s = s.replace(/!\[([^\]]*)]/g, (_, alt) => '![' + String(alt).replace(/\\_/g, '_') + ']');
  return s;
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('Missing folder:', SRC);
    process.exit(1);
  }

  const entries = fs.readdirSync(SRC, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_')) continue;

    const slug = stripLeadingDateFromSlug(entry.name);
    const srcDir = path.join(SRC, entry.name);
    const destDir = path.join(DEST, slug);
    const srcIndex = path.join(srcDir, 'index.md');
    if (!fs.existsSync(srcIndex)) continue;

    fs.mkdirSync(destDir, { recursive: true });
    fs.cpSync(srcDir, destDir, { recursive: true, force: true });

    const raw = fs.readFileSync(path.join(destDir, 'index.md'), 'utf8');
    const { data, content } = matter(raw);

    const cover = data.coverImage ?? data.featuredImage ?? data.cover;
    const featuredImage = findFeaturedRelative(destDir, cover);

    const newData = {
      title: data.title || slug,
      date: formatDate(data.date),
      author: data.author != null ? String(data.author) : '',
      excerpt: (data.excerpt && String(data.excerpt).trim()) || excerptFromContent(content),
      category: pickCategory(data.categories),
      tags: normalizeTags(data.tags),
      ...(featuredImage ? { featuredImage } : {}),
    };

    const body = normalizeMarkdownBody(content.trimStart());
    const out = matter.stringify(body, newData, { delimiters: '---' });
    fs.writeFileSync(path.join(destDir, 'index.md'), out, 'utf8');
    console.log('Imported:', slug);
    count++;
  }

  console.log('Done. Posts imported:', count);
}

main();

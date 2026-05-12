# Blog Posts

This directory contains all blog posts for the Forceweaver blog. Each blog post is organized in its own folder for better management.

## Folder Structure

```
posts/
├── blog-post-slug/
│   ├── index.md                    # The blog post markdown file
│   ├── feature-image.webp          # Featured image
│   ├── diagram-1.webp              # Inline images
│   └── screenshot-2.png            # More images
```

## Creating a New Blog Post

### 1. Create a New Folder

Create a new folder with the blog post slug (URL-friendly name):

```bash
mkdir domains/blog/content/posts/my-new-blog-post
```

### 2. Create index.md

Create `index.md` inside your folder with the following frontmatter:

```markdown
---
title: "Your Blog Post Title"
date: "2025-01-15"
author: "Your Name"
excerpt: "A brief summary of the blog post (1-2 sentences)"
category: "Category Name"
tags: ["Tag1", "Tag2", "Tag3"]
featuredImage: "feature-image.webp"
status: published
---

Your content here...
```

### 3. Add Images

Place all images in the same folder as `index.md`. The images will be automatically copied to the public directory during build.

**Important:**
- Use **relative paths** in your markdown
- **NO SPACES** in filenames - use dashes instead
- Supported formats: `.webp`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.svg`

### 4. Reference Images in Markdown

#### Featured Image (in frontmatter):
```yaml
featuredImage: "my-featured-image.webp"
```

#### Inline Images (in content):
```markdown
![Alt text](my-diagram.webp)
![Another image](screenshot.png)
```

The system will automatically transform these relative paths to absolute URLs like `/blog/images/my-blog-post-slug/my-diagram.webp`

## Example Blog Post Structure

```
posts/
├── welcome-to-forceweaver-blog/
│   └── index.md
│
└── sku-proliferation/
    ├── index.md
    ├── feature-image.webp
    ├── sku_proliferation_impact.webp
    └── sku-proliferation-busters.webp
```

## Frontmatter Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `title` | Yes | Post title | "How to Deploy Revenue Cloud" |
| `date` | Yes | Publication date (YYYY-MM-DD) | "2025-01-15" |
| `author` | No | Author name (defaults to "Forceweaver Team") | "John Doe" |
| `excerpt` | Yes | Short summary for listings | "Learn how to..." |
| `category` | No | Post category (defaults to "General") | "Tutorial" |
| `tags` | No | Array of tags | ["Salesforce", "CPQ"] |
| `featuredImage` | No | Relative path to featured image | "hero.webp" |
| `status` | No | `published` (visible on the site) or `draft` (repo only, hidden from blog index and post URLs). If omitted, the post is public unless legacy `published: false` is set. | `published` |
| `published` | No | **Legacy:** set to `false` to hide the post (same effect as `status: draft`). Ignored when `status` is set to a non-empty value. | `false` |

## Categories

Suggested categories:
- **Announcements** - Company and product updates
- **Tutorials** - Step-by-step guides
- **Best Practices** - Tips and recommendations
- **Case Studies** - Real-world implementations
- **Revenue Cloud** - Revenue Cloud specific content
- **Development** - Developer tips and techniques

## Tags

Use descriptive tags to help users find related content:
- `Salesforce`, `CPQ`, `Revenue Cloud`
- `Testing`, `Automation`, `CI/CD`
- `Best Practices`, `Tutorial`, `Guide`
- `Product Update`, `Feature Release`

## Writing Guidelines

### Content

- **Clear headlines** - Use descriptive H2 and H3 headings
- **Short paragraphs** - Keep paragraphs to 3-4 sentences
- **Code examples** - Use fenced code blocks with language hints
- **Images** - Add alt text for accessibility
- **Links** - Use descriptive link text, not "click here"

### Markdown Formatting

```markdown
## Heading 2
### Heading 3

**Bold text** and *italic text*

- Bullet point 1
- Bullet point 2

1. Numbered item
2. Numbered item

> Blockquote for important notes

\`inline code\`

\`\`\`javascript
// Code block
function example() {
  return true;
}
\`\`\`

[Link text](https://example.com)

![Image alt text](image.webp)
```

## Image Guidelines

### File Naming
- ✅ `revenue-cloud-dashboard.webp`
- ✅ `cpq-flow-diagram.png`
- ❌ `Screen Shot 2025-01-15.png`
- ❌ `my image with spaces.jpg`

### Optimization
- Recommended max width: **1200px**
- Use **WebP format** when possible for better compression
- Optimize before adding (tools: TinyPNG, Squoosh, ImageOptim)
- Featured images should be **16:9 aspect ratio**

### Accessibility
Always add meaningful alt text:
```markdown
![Diagram showing SKU proliferation impact on business](sku-impact.webp)
```

## Publishing

1. **Create your blog folder** with `index.md` and images
2. **Commit and push** to the repository
3. **Vercel will automatically build** and deploy
4. **Images are automatically copied** to the public directory during build

No manual steps needed!

## Testing Locally

```bash
cd apps/web
npm run dev
```

Visit `http://localhost:3000/blog` to see your posts.

## Troubleshooting

### Images not showing?
- Check that images are in the same folder as `index.md`
- Verify filenames have no spaces
- Make sure you're using relative paths in markdown

### Build errors?
- Verify all required frontmatter fields are present
- Check for YAML syntax errors in frontmatter
- Ensure dates are in YYYY-MM-DD format

### Post not appearing?
- Make sure the file is named exactly `index.md`
- Check that the folder name is URL-friendly (lowercase, dashes)
- Verify frontmatter is properly formatted with `---` delimiters
- If the post should stay in the repo but not on the public site, set `status: draft` (or legacy `published: false`). Use `status: published` or omit `status` for a live post.

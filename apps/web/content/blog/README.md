# Blog Posts

This directory contains all blog posts for the Forceweaver blog at `https://www.forceweaver.com/blog`.

## Adding a New Blog Post

### 1. Create a Markdown File

Create a new `.md` file in this directory with a descriptive slug as the filename:
```
your-post-title.md
```

The filename will become the URL slug: `https://www.forceweaver.com/blog/your-post-title`

### 2. Add Frontmatter

Start your file with frontmatter (metadata) in YAML format:

```markdown
---
title: "Your Post Title"
date: "2025-01-13"
author: "Your Name"
excerpt: "A brief description of your post that appears in the blog listing and SEO."
category: "Category Name"
tags: ["Tag1", "Tag2", "Tag3"]
featuredImage: "/blog/your-image.jpg"
---

Your actual blog content goes here...
```

### 3. Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | ✅ Yes | The title of your blog post |
| `date` | ✅ Yes | Publication date in YYYY-MM-DD format |
| `author` | ✅ Yes | Author name (e.g., "Forceweaver Team", your name) |
| `excerpt` | ✅ Yes | Short description (150-200 characters) |
| `category` | ✅ Yes | Main category (e.g., "Salesforce", "Testing", "Development") |
| `tags` | ✅ Yes | Array of relevant tags |
| `featuredImage` | ❌ No | Path to featured image (optional) |

### 4. Writing Content

Use standard Markdown syntax:

```markdown
# Main Heading (H1)

## Section Heading (H2)

### Subsection (H3)

Regular paragraph text.

**Bold text** and *italic text*

- Bullet point
- Another point

1. Numbered list
2. Second item

[Link text](https://example.com)

![Image alt text](/path/to/image.jpg)

> Blockquote for callouts or quotes

`inline code` for technical terms

\`\`\`javascript
// Code block with syntax highlighting
function example() {
  return "Hello, World!";
}
\`\`\`
```

### 5. Categories

Use these standard categories or create new ones:
- **Salesforce** - General Salesforce topics
- **Testing** - Testing strategies and automation
- **Development** - Code examples and best practices
- **Revenue Cloud** - Specific to Revenue Cloud
- **Tools** - Product updates and tool guides
- **Case Studies** - Implementation stories
- **Announcements** - Company and product news

### 6. Tags

Add 3-5 relevant tags:
- Technical tags: `Apex`, `LWC`, `Integration`, `API`
- Topic tags: `Automation`, `CI/CD`, `Performance`, `Security`
- Product tags: `Revenue Cloud`, `CPQ`, `Billing`

### 7. Images

Store images in `/apps/monetization-web/public/blog/` and reference them as:
```markdown
![Alt text](/blog/your-image.jpg)
```

### 8. Preview Locally

After adding your post, restart the development server:
```bash
npm run dev
```

Visit:
- Blog listing: `http://localhost:3000/blog`
- Your post: `http://localhost:3000/blog/your-post-slug`

### 9. Deploy

Commit and push your changes. The blog will automatically rebuild on Vercel.

## Example Post

See `welcome-to-forceweaver-blog.md` for a complete example.

## Tips

1. **SEO**: Write descriptive excerpts and titles
2. **Readability**: Use headings to break up content
3. **Code**: Use code blocks for technical content
4. **Images**: Optimize images before uploading (< 500KB)
5. **Links**: Always include relevant internal and external links
6. **Reading Time**: Automatically calculated (avg. 200 words/min)

## Exporting from Medium

If you're importing from Medium:

1. Export your Medium posts (Settings → Security → Download your information)
2. Convert HTML to Markdown using [this tool](https://www.browserling.com/tools/html-to-markdown)
3. Add frontmatter metadata
4. Update image paths
5. Review and adjust formatting

## Questions?

Contact the development team for help with blog posts.


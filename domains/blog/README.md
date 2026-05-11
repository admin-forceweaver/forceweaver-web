# Blog Domain

This domain contains all blog-related functionality for the Forceweaver blog at `https://www.forceweaver.com/blog`.

## Structure

```
domains/blog/
├── components/          # Blog UI components
│   ├── BlogCard.tsx
│   ├── BlogList.tsx
│   └── BlogPost.tsx
├── lib/                # Blog utilities
│   └── blog.ts         # Markdown parsing, filtering
├── content/            # Blog content
│   └── posts/          # Markdown blog posts
│       ├── post-1.md
│       ├── post-2.md
│       └── README.md   # Guide for adding posts
└── package.json
```

## Adding Blog Posts

All blog posts are written in Markdown and stored in `content/posts/`.

### Creating a New Post

1. **Create a Markdown file** in `content/posts/`:
   ```bash
   touch domains/blog/content/posts/your-article-slug.md
   ```

2. **Add frontmatter and content**:
   ```markdown
   ---
   title: "Your Article Title"
   date: "2025-01-15"
   author: "Your Name"
   excerpt: "A brief description of your article (150-200 characters)"
   category: "Category Name"
   tags: ["Tag1", "Tag2", "Tag3"]
   featuredImage: "/blog/your-image.jpg"
   ---

   # Your Article Title

   Your content here in Markdown format...

   ## Section Heading

   More content...
   ```

3. **Deploy**:
   ```bash
   git add .
   git commit -m "Add blog post: your-article-title"
   git push
   ```

### Frontmatter Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `title` | ✅ Yes | Article title | `"Getting Started with Salesforce"` |
| `date` | ✅ Yes | Publication date | `"2025-01-15"` (YYYY-MM-DD) |
| `author` | ✅ Yes | Author name | `"Forceweaver Team"` |
| `excerpt` | ✅ Yes | Short description | `"Learn how to..."` |
| `category` | ✅ Yes | Main category | `"Salesforce"` |
| `tags` | ✅ Yes | Array of tags | `["Apex", "Testing"]` |
| `featuredImage` | ❌ No | Image path | `"/blog/featured.jpg"` |

### Categories

Standard categories (or create your own):

- **Salesforce** - General Salesforce topics
- **Testing & Automation** - Testing strategies
- **Development** - Code examples and best practices
- **Revenue Cloud** - Revenue Cloud specific
- **Tools & Products** - Product updates and guides
- **Case Studies** - Implementation stories
- **Announcements** - Company and product news
- **Best Practices** - How-to guides

### Markdown Syntax

```markdown
# H1 Heading
## H2 Heading
### H3 Heading

**Bold text** and *italic text*

[Link text](https://example.com)

![Image alt text](/blog/image.jpg)

- Bullet point
- Another point

1. Numbered list
2. Second item

> Blockquote for important notes

`inline code` for technical terms

\`\`\`javascript
// Code block with syntax highlighting
function example() {
  return "Hello!";
}
\`\`\`
```

### Images

1. **Add images** to `apps/web/public/blog/`:
   ```bash
   cp your-image.jpg apps/web/public/blog/
   ```

2. **Reference in markdown**:
   ```markdown
   ![Alt text](/blog/your-image.jpg)
   ```

3. **Featured images** (shown in cards):
   ```yaml
   featuredImage: "/blog/your-image.jpg"
   ```

### Tips for Great Posts

1. **SEO Optimization**
   - Write descriptive titles (50-60 characters)
   - Create compelling excerpts (150-160 characters)
   - Use relevant tags (3-5 tags)

2. **Readability**
   - Use headings to break up content
   - Keep paragraphs short (3-4 sentences)
   - Use bullet points and lists
   - Add code examples for technical content

3. **Images**
   - Optimize images (< 500KB)
   - Use descriptive alt text
   - Include featured image for better sharing

4. **Engagement**
   - Add relevant internal links
   - Include external references
   - End with a call-to-action

### Importing from Medium

If you're importing articles from Medium:

1. **Export from Medium**
   - Go to Settings → Security → Download your information
   - Wait for email with export link

2. **Convert to Markdown**
   - Use [HTML to Markdown converter](https://www.browserling.com/tools/html-to-markdown)
   - Or use [Pandoc](https://pandoc.org/): `pandoc -f html -t markdown post.html -o post.md`

3. **Add frontmatter**
   - Add the YAML frontmatter at the top
   - Fill in all required fields

4. **Update image paths**
   - Download images from Medium
   - Upload to `apps/web/public/blog/`
   - Update image references

5. **Review and adjust**
   - Check formatting
   - Test code blocks
   - Verify links

### Example: Complete Post

```markdown
---
title: "10 Best Practices for Salesforce Testing"
date: "2025-01-15"
author: "John Doe"
excerpt: "Discover proven strategies to improve your Salesforce testing workflow and catch bugs before they reach production."
category: "Testing & Automation"
tags: ["Salesforce", "Testing", "Best Practices", "QA"]
featuredImage: "/blog/testing-best-practices.jpg"
---

# 10 Best Practices for Salesforce Testing

Testing is crucial for maintaining reliable Salesforce applications. Here are 10 proven strategies...

## 1. Automate Your Regression Tests

Manual testing is time-consuming and error-prone. Automation helps you...

\`\`\`apex
@isTest
private class MyTestClass {
    @isTest
    static void testMethod() {
        // Test code here
    }
}
\`\`\`

## 2. Use Test Data Factories

Creating test data manually leads to...

[Continue with remaining best practices...]
```

## Development

### Local Testing

```bash
# From workspace root
cd apps/web
npm run dev

# Visit:
# - Blog listing: http://localhost:3000/blog
# - Individual post: http://localhost:3000/blog/your-slug
```

### Adding Dependencies

```bash
cd domains/blog
npm install package-name
```

## Deployment

Blog posts are automatically deployed when you push to the main branch. The Next.js app rebuilds and generates static pages for each post.

### URLs

- **Production**: `https://www.forceweaver.com/blog`
- **Staging**: `https://staging.forceweaver.com/blog` (if configured)

## Features

✅ **Markdown-based** - Easy to write and version control  
✅ **Search & Filter** - Category filters and real-time search  
✅ **SEO Optimized** - Meta tags, Open Graph, structured data  
✅ **Social Sharing** - Twitter and LinkedIn share buttons  
✅ **Reading Time** - Auto-calculated (200 words/min)  
✅ **Responsive** - Mobile-first design  
✅ **Syntax Highlighting** - Code blocks with language support  

## Support

For help with blog posts or technical issues, contact the development team or open an issue in the repository.


# ForceWeaver Web

Marketing site for [forceweaver.com](https://forceweaver.com) and the blog at [blog.forceweaver.com](https://blog.forceweaver.com), built with Next.js 15.

## Development

```bash
npm install
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000). Blog routes are available at `/blog` locally; in production, `forceweaver.com/blog` redirects to the blog subdomain.

## Build

```bash
npm run build:web
```

## Structure

- `apps/web` — Next.js application (Vercel root directory)
- `domains/blog` — Markdown posts, blog components, and post utilities
- `domains/company` — Company marketing sections and header

## Environment variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical marketing origin, e.g. `https://forceweaver.com` |
| `NEXT_PUBLIC_BLOG_URL` | Canonical blog origin, e.g. `https://blog.forceweaver.com` |
| `BLOG_HOSTS` | Optional comma-separated hostnames treated as the blog site (default: `blog.forceweaver.com`) |
| `APEX_HOSTS` | Optional comma-separated marketing hosts (default: `forceweaver.com,www.forceweaver.com`) |

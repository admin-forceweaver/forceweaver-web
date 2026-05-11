# ForceWeaver Web (`@apps/web`)

Next.js 15 marketing site and markdown blog. Content lives under `../../domains/blog` and `../../domains/company`.

## Commands

From the monorepo root:

```bash
npm run dev:web
npm run build:web
```

From this directory:

```bash
npm run dev
npm run build
```

## Environment variables

| Variable | Example | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SITE_URL` | `https://forceweaver.com` | Canonical marketing URLs and default `metadataBase` |
| `NEXT_PUBLIC_BLOG_URL` | `https://blog.forceweaver.com` | Canonical blog URLs, footer/header blog links, post cards |
| `APEX_HOSTS` | `forceweaver.com,www.forceweaver.com` | Hosts that receive `/blog` → blog subdomain redirects |
| `BLOG_HOSTS` | `blog.forceweaver.com` | Hosts that rewrite `/` and `/{slug}` to internal blog routes |

## Vercel

Set the project **Root Directory** to `apps/web` (or run build from repo root with the equivalent setting). Attach both `forceweaver.com` and `blog.forceweaver.com` to this project.

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
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | `phc_xxxxx` | PostHog project token. Without it analytics never initializes. Share the same value with `revsnap.forceweaver.com` for unified tracking. |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` | Optional. Override the PostHog ingest origin. When empty the browser uses the same-origin `/ingest` proxy configured in `next.config.ts`. |
| `NEXT_PUBLIC_POSTHOG_UI_HOST` | `https://us.posthog.com` | Optional. PostHog UI host used for "View in PostHog" links. |
| `POSTHOG_INGEST_HOST` | `https://us.i.posthog.com` | Optional. Server-side rewrite target for `/ingest/:path*` (defaults to US). Set the EU host for EU projects. |
| `POSTHOG_ASSETS_HOST` | `https://us-assets.i.posthog.com` | Optional. Server-side rewrite target for `/ingest/static/:path*` and `/ingest/array/:path*`. |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | `.forceweaver.com` | Optional. Cookie domain for the consent cookie so the same decision applies across all ForceWeaver subdomains. Auto-detected in production; leave empty for `localhost`. |

## Vercel

Set the project **Root Directory** to `apps/web` (or run build from repo root with the equivalent setting). Attach both `forceweaver.com` and `blog.forceweaver.com` to this project.

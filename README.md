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
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | PostHog project API key. Without it the analytics SDK never initializes. |
| `NEXT_PUBLIC_POSTHOG_HOST` | Optional. Override the PostHog ingest origin (e.g. `https://eu.i.posthog.com`). When empty, the browser uses the same-origin `/ingest` proxy. |
| `NEXT_PUBLIC_POSTHOG_UI_HOST` | Optional. PostHog UI host link used by the SDK (defaults to `https://us.posthog.com`). |
| `POSTHOG_INGEST_HOST` | Optional. Server-side target for `/ingest/:path*` rewrites (defaults to `https://us.i.posthog.com`). Set to the EU host for EU PostHog projects. |
| `POSTHOG_ASSETS_HOST` | Optional. Server-side target for `/ingest/static/:path*` and `/ingest/array/:path*` rewrites (defaults to `https://us-assets.i.posthog.com`). |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | Optional. Cookie domain used for the consent cookie. Auto-detects `.forceweaver.com` in production; override for staging. |

### Analytics unification

`forceweaver.com`, `blog.forceweaver.com`, and the future `revsnap.forceweaver.com` app should all use the **same** `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_COOKIE_DOMAIN` so one consent decision and a single anonymous distinct_id apply across every property. See [`docs/COOKIE_CONSENT_AND_TRACKING.md`](./docs/COOKIE_CONSENT_AND_TRACKING.md) for the long-form design (authenticated legal acceptance lives in the product app, not in this marketing site).

# Revsnap consent + analytics integration requirements

This document is a **handover spec** for the AI coding tool working on the Revsnap product app (deployed at `https://revsnap.forceweaver.com`). It tells you everything you need to do so that Revsnap and the ForceWeaver marketing site (`https://forceweaver.com`, `https://blog.forceweaver.com`) share **one** privacy decision per visitor across all properties.

There are two complementary tracks. Implement both:


| Track                                                            | Audience                                                                 | Storage                                                                                                            | Purpose                                                                                                                                                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Cookie / analytics consent (shared across all subdomains)** | Anonymous and logged-in browser sessions on any `*.forceweaver.com` host | Browser cookie `forceweaver-consent` on `.forceweaver.com` (+ localStorage backup)                                 | Gate PostHog product analytics, marketing pixels, and preference cookies.                                                                                                                      |
| **2. Authenticated legal acceptance (Revsnap only)**             | Authenticated Revsnap users                                              | Postgres `user_privacy_preferences` (per-user row) and `app_legal_publish` (single-row, current published version) | Single source of truth for **which published Privacy Policy / Terms version** the user has accepted. Drives a non-dismissible re-consent overlay when `NEXT_PUBLIC_PRIVACY_VERSION` is bumped. |


**The two tracks are independent.** Bumping the cookie `CONSENT_VERSION` (Track 1) does **not** force users to re-accept the legal policy, and bumping `NEXT_PUBLIC_PRIVACY_VERSION` (Track 2) does **not** revoke cookie consent. Product and legal decide when to bump one, the other, or both in the same release.

The forceweaver-web marketing site already implements Track 1. The legacy `revsnap_privacy_v1` localStorage key used by previous Revsnap iterations must be **migrated to the shared cookie format** described below.

---

## Track 1 — Shared cookie / analytics consent

### Goal

A visitor who lands on `https://forceweaver.com`, clicks "Accept All" on the banner, and then navigates to `https://revsnap.forceweaver.com/signup` must **not** see another cookie banner. Their PostHog opt-in must already be active when Revsnap initializes the SDK.

The reverse also has to work: a user who toggles "Analytics off" inside the Revsnap dashboard must see analytics disabled on `forceweaver.com` and `blog.forceweaver.com` after the next page load.

### Cookie contract (must match exactly)


| Property        | Value                                                                                                                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cookie name** | `forceweaver-consent`                                                                                                                                                                                                   |
| **Domain**      | `.forceweaver.com` in production. `undefined` (host-only) on `localhost` and preview deploys. Auto-detect from `window.location.hostname.endsWith('forceweaver.com')`; allow override with `NEXT_PUBLIC_COOKIE_DOMAIN`. |
| **Path**        | `/`                                                                                                                                                                                                                     |
| `**SameSite`**  | `Lax`                                                                                                                                                                                                                   |
| `**Secure**`    | `true` in production (`NODE_ENV === 'production'`), `false` in dev                                                                                                                                                      |
| `**HttpOnly**`  | `false` (client must be able to read it)                                                                                                                                                                                |
| **Expiry**      | 395 days (13 months) from write time                                                                                                                                                                                    |
| **Backup**      | Mirror the same JSON into `localStorage` under key `forceweaver-consent-backup` for cookie-clearing scenarios.                                                                                                          |


### Cookie payload (JSON, stringified)

The cookie value is a JSON.stringified object with this exact shape:

```ts
export type ConsentCategory = 'analytics' | 'marketing' | 'preferences';

export interface ConsentState {
  version: string;     // currently '1.0'; mismatched values trigger re-consent
  analytics: boolean;  // user opted in to PostHog / product analytics
  marketing: boolean;  // user opted in to marketing pixels (reserved, currently unused)
  preferences: boolean;// user opted in to preference cookies (reserved, currently unused)
  timestamp: number;   // Date.now() when the decision was saved
  expiresAt: number;   // Date.now() + 395 days (in ms)
}
```

Notes:

- `version` is a plain string compared via `===`. Bumping it from `'1.0'` to `'2.0'` invalidates all stored decisions and forces a fresh banner choice. **Keep both apps in lockstep when you bump.**
- An expired cookie (`state.expiresAt < Date.now()`) must be treated as "no decision" and cleared.
- A cookie whose `version` does not match the runtime `CONSENT_VERSION` must also be treated as "no decision" and cleared.

### Required behavior on Revsnap

Implement, in this order, on the Revsnap codebase:

1. **Read the shared cookie on app boot.** Before initializing PostHog or rendering any banner, parse `forceweaver-consent`. If it exists, has a non-expired `expiresAt`, and a matching `version`, use it as the current decision. **Do not show your own banner.**
2. **Fall back to localStorage backup.** If the cookie is missing but `forceweaver-consent-backup` exists in localStorage, re-hydrate the cookie from it.
3. **Show the banner only if there is no valid decision.** When the user clicks Accept All / Essential Only / Save Preferences inside Revsnap's banner or settings modal, write the cookie with the domain `.forceweaver.com` so the choice propagates to `forceweaver.com` and `blog.forceweaver.com`.
4. **Re-read the cookie on every page navigation.** Cookies do not emit change events. Use a `visibilitychange` or route-change listener so a decision made in another tab takes effect immediately.
5. **Mirror the cookie into `localStorage` on every write.** Use the same key (`forceweaver-consent-backup`).
6. **Delete BOTH host-only and `.forceweaver.com`-scoped cookies on withdraw.** Browsers do not auto-remove a leading-dot cookie when you call `Cookies.remove(name)` without specifying a domain.

### Reference implementation to mirror

Use this as a copy/paste starting point. It is the exact module shipping in forceweaver-web at `apps/web/lib/consent/consentStorage.ts`.

```ts
import Cookies from 'js-cookie';

const CONSENT_COOKIE_NAME = 'forceweaver-consent';
const CONSENT_STORAGE_KEY = 'forceweaver-consent-backup';
const CONSENT_VERSION = '1.0';
const CONSENT_EXPIRY_MS = 13 * 30 * 24 * 60 * 60 * 1000;

export type ConsentCategory = 'analytics' | 'marketing' | 'preferences';
export interface ConsentState {
  version: string;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  timestamp: number;
  expiresAt: number;
}

function resolveCookieDomain(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim();
  if (explicit) return explicit;
  if (typeof window === 'undefined') return undefined;
  const host = window.location.hostname;
  if (host === 'forceweaver.com' || host.endsWith('.forceweaver.com')) {
    return '.forceweaver.com';
  }
  return undefined;
}

export class ConsentStorage {
  static save(consent: Partial<ConsentState>): void {
    const now = Date.now();
    const state: ConsentState = {
      version: CONSENT_VERSION,
      analytics: consent.analytics ?? false,
      marketing: consent.marketing ?? false,
      preferences: consent.preferences ?? false,
      timestamp: now,
      expiresAt: now + CONSENT_EXPIRY_MS,
    };
    const domain = resolveCookieDomain();
    Cookies.set(CONSENT_COOKIE_NAME, JSON.stringify(state), {
      expires: 395,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      ...(domain ? { domain } : {}),
    });
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage unavailable; cookie alone is fine.
    }
  }

  static load(): ConsentState | null {
    const raw = Cookies.get(CONSENT_COOKIE_NAME);
    if (raw) {
      try {
        const state = JSON.parse(raw) as ConsentState;
        if (state.expiresAt < Date.now()) { this.clear(); return null; }
        if (state.version !== CONSENT_VERSION) { this.clear(); return null; }
        return state;
      } catch { /* fall through to backup */ }
    }
    try {
      const local = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (local) {
        const state = JSON.parse(local) as ConsentState;
        if (state.expiresAt >= Date.now() && state.version === CONSENT_VERSION) {
          this.save(state);
          return state;
        }
      }
    } catch { /* ignore */ }
    return null;
  }

  static clear(): void {
    const domain = resolveCookieDomain();
    Cookies.remove(CONSENT_COOKIE_NAME);
    if (domain) Cookies.remove(CONSENT_COOKIE_NAME, { domain });
    try { localStorage.removeItem(CONSENT_STORAGE_KEY); } catch { /* ignore */ }
  }

  static hasConsent(category: ConsentCategory): boolean {
    return this.load()?.[category] === true;
  }
}
```

### Migrating off `revsnap_privacy_v1`

Revsnap previously stored its decision in `localStorage` under `revsnap_privacy_v1` with a different schema (`consent: 'none' | 'settled'`, `cookiePreferences.analytics`, `consentDate`, `consentVersion`, plus engagement fields). On the first boot after this change ships:

1. Read `revsnap_privacy_v1` from localStorage if present.
2. If `consent === 'settled'`, write a new `forceweaver-consent` cookie with:
  - `analytics = cookiePreferences.analytics ?? false`
  - `marketing = false`
  - `preferences = false`
  - `version = '1.0'`
  - `timestamp = Date.parse(consentDate)` (fallback to `Date.now()`)
  - `expiresAt = timestamp + 395 days`
3. Delete `revsnap_privacy_v1` so the migration is one-shot.
4. Keep engagement fields in a separate localStorage key (e.g. `revsnap_engagement_v1`) if you still need them — they are app-specific, not part of the shared consent contract.

### PostHog configuration (must match across both apps)


| Setting                                             | Value                                                                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Project token (`NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`) | **Identical** to the value used by forceweaver-web. One PostHog project, one anonymous `distinct_id` across all properties. |
| `api_host`                                          | `/ingest` (same-origin proxy). Override with `NEXT_PUBLIC_POSTHOG_HOST` only if you have a reason.                          |
| `ui_host`                                           | `https://us.posthog.com` (or EU equivalent if the project lives in EU PostHog)                                              |
| `cross_subdomain_cookie`                            | `true` (PostHog default). Lets PostHog set its own cookie on `.forceweaver.com`.                                            |
| `persistence`                                       | `'localStorage+cookie'`                                                                                                     |
| `opt_out_capturing_by_default`                      | `true`                                                                                                                      |
| `opt_out_persistence_by_default`                    | `true`                                                                                                                      |
| `autocapture`                                       | `true`                                                                                                                      |
| `disable_session_recording`                         | `true` (revisit later if you want replay)                                                                                   |
| `capture_exceptions`                                | `true`                                                                                                                      |
| `defaults`                                          | `'2026-01-30'`                                                                                                              |


After `posthog.init(...)`, **synchronize opt-in/out from the consent cookie**:

```ts
const analyticsConsent = ConsentStorage.hasConsent('analytics');
if (analyticsConsent && posthog.has_opted_out_capturing()) {
  posthog.opt_in_capturing();
} else if (!analyticsConsent && !posthog.has_opted_out_capturing()) {
  posthog.opt_out_capturing();
}
```

Re-run that block whenever the consent state changes (banner accept/decline, settings save, withdraw).

### Required Next.js rewrites for the `/ingest` proxy

Add these to `next.config.ts` so the browser never talks to a third-party host:

```ts
const POSTHOG_INGEST_HOST = (process.env.POSTHOG_INGEST_HOST ?? 'https://us.i.posthog.com').replace(/\/$/, '');
const POSTHOG_ASSETS_HOST = (process.env.POSTHOG_ASSETS_HOST ?? 'https://us-assets.i.posthog.com').replace(/\/$/, '');

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: `${POSTHOG_ASSETS_HOST}/static/:path`* },
      { source: '/ingest/array/:path*',  destination: `${POSTHOG_ASSETS_HOST}/array/:path`* },
      { source: '/ingest/:path*',        destination: `${POSTHOG_INGEST_HOST}/:path`* },
    ];
  },
};
```

If Revsnap has middleware, **ensure `/ingest` is short-circuited** in the middleware before any host-based rewrite logic runs. Otherwise PostHog requests will be 308-redirected or rewritten incorrectly.

### Required environment variables


| Variable                            | Required            | Purpose                                                                                                                                            |
| ----------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | Yes for analytics   | Same value as forceweaver-web.                                                                                                                     |
| `NEXT_PUBLIC_POSTHOG_HOST`          | No                  | If empty, browser uses same-origin `/ingest`.                                                                                                      |
| `NEXT_PUBLIC_POSTHOG_UI_HOST`       | No                  | Defaults to `https://us.posthog.com`.                                                                                                              |
| `POSTHOG_INGEST_HOST`               | No                  | Server rewrite target. Defaults to `https://us.i.posthog.com`. Set to the EU host for EU PostHog projects. **Must match forceweaver-web's value.** |
| `POSTHOG_ASSETS_HOST`               | No                  | Server rewrite target. Defaults to `https://us-assets.i.posthog.com`. **Must match forceweaver-web's value.**                                      |
| `NEXT_PUBLIC_COOKIE_DOMAIN`         | Recommended in prod | `.forceweaver.com`. Leave empty locally.                                                                                                           |


---

## Track 2 — Authenticated legal acceptance (Revsnap only)

The marketing site does not implement Track 2 because it has no authenticated user surface. Revsnap **must** implement (or keep) this track. It is the SOC2-oriented "active preferences" layer: a durable per-user record with strict Row-Level Security, plus an enforcement UI that does not rely on middleware redirects.

### Behavior

1. `**NEXT_PUBLIC_PRIVACY_VERSION`** — Public env string (e.g. `v1.0`) naming the **currently published** Privacy Policy / Terms bundle. Bump it in the same release as legal publishes an update requiring acknowledgment.
2. **Server prefetch** — Dashboard and billing layouts load the user's `user_privacy_preferences` row server-side as early as possible and pass it to the client provider so the UI does not wait on an extra round-trip to decide whether to show the modal.
3. **Client enforcement** — A `PrivacyEnforcementProvider` uses TanStack Query (cached key `['privacy-preferences', userId]`) and compares `accepted_policy_version` to `NEXT_PUBLIC_PRIVACY_VERSION` using **string equality**. If the env var is empty, skip the overlay (useful for local experiments; production should always set it).
4. **Modal** — A `ReConsentModal`: full-viewport backdrop with `backdrop-blur-md`, **non-dismissible** (no close control; backdrop click does not complete the flow). The user must click "I Accept"; the client writes `accepted_policy_version` via the Supabase browser client (RLS applies). On success, the query cache updates and the modal unmounts without a full page reload.
5. **Scope** — Wrap authenticated route groups (e.g. the main app dashboard layout **and** the billing layout, since billing typically sits outside the dashboard route group).

### Database schema

#### `user_privacy_preferences`


| Column                    | Meaning                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `user_id`                 | PK, FK to `auth.users(id)`.                                                                           |
| `marketing_opt_in`        | Default `false`.                                                                                      |
| `telemetry_opt_in`        | Default `true` (or align with your lawful basis in the privacy notice).                               |
| `accepted_policy_version` | `text`, **nullable**. `NULL` means the user has not yet accepted the current in-app required version. |
| `updated_at`              | Maintained on update via trigger.                                                                     |


Suggested migration name: `020_user_privacy_preferences.sql`.

**Seeding new signups:** `public.handle_new_user()` (the standard Supabase signup trigger) must insert a row for each new auth user with `accepted_policy_version` copied from `app_legal_publish.privacy_terms_version` (row `id = 1`). That value **must** match `NEXT_PUBLIC_PRIVACY_VERSION` in the same deploy.

**Historical backfill:** The migration should insert rows for existing `auth.users` with `accepted_policy_version` **NULL**. Those users see the re-consent modal until they accept (or you run a grandfathering update with legal sign-off).

**RLS:** Authenticated users may **SELECT**, **INSERT**, and **UPDATE** **only** their own row (`auth.uid() = user_id`). No service-role writes from the client.

#### `app_legal_publish`


| Column                  | Meaning                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `id`                    | Always `1` (single-row table). Enforce with a check constraint.                                                      |
| `privacy_terms_version` | Published legal bundle id (e.g. `v1.0`). Signup copies this into `user_privacy_preferences.accepted_policy_version`. |


Suggested migration name: `030_app_legal_publish.sql`.

**RLS:** `anon` and `authenticated` may **SELECT** only. No client writes; updates happen via migrations or service role. If row `id = 1` is missing or empty, new signups must fail (`handle_new_user` should raise).

### Legal release process

When legal publishes a new Privacy Policy / Terms bundle that requires in-app acknowledgment:

1. Add a migration that runs `UPDATE public.app_legal_publish SET privacy_terms_version = '<new>' WHERE id = 1;` (use the same string everywhere).
2. Set `NEXT_PUBLIC_PRIVACY_VERSION` to that string on Vercel / `.env.local` in the **same** release.
3. **Existing users:** enforcement is string equality against the env var. Anyone with an older value (or `NULL`) sees the re-consent modal until they click "I Accept".
4. **New users** created after the migration get the new version from `app_legal_publish` and skip the modal until the next bump.

### Backfill options for legacy users


| Situation                                           | Behavior                                                                                                                                                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backfill row with `accepted_policy_version IS NULL` | Still sees the legal modal when `NEXT_PUBLIC_PRIVACY_VERSION` is set, until they accept or you grandfather.                                                                                                                                      |
| New signup after `030`                              | `accepted_policy_version` seeded from `app_legal_publish`; no redundant modal right after cookie consent.                                                                                                                                        |
| Grandfathering (optional, requires legal sign-off)  | One-shot SQL: `UPDATE user_privacy_preferences SET accepted_policy_version = (SELECT privacy_terms_version FROM app_legal_publish WHERE id = 1) WHERE accepted_policy_version IS NULL;` aligns legacy `NULL` rows with the current published id. |


Choose explicitly: **strict** (keep `NULL` until each user accepts) vs **grandfather** (bulk update once).

---

## End-to-end architecture

```mermaid
flowchart TD
  subgraph marketing [forceweaver.com / blog.forceweaver.com]
    mb[Cookie banner] --> cookie
    msettings[Cookie settings] --> cookie
  end

  subgraph app [revsnap.forceweaver.com]
    appBoot[App boot] --> readCookie[Read forceweaver-consent]
    readCookie -->|exists, valid| skipBanner[Skip banner, sync PostHog]
    readCookie -->|missing or expired| appBanner[Show banner]
    appBanner --> cookie
    appSettings[In-app cookie settings] --> cookie
  end

  cookie[("forceweaver-consent cookie on .forceweaver.com")] --> ph[PostHog opt-in or opt-out]
  ph --> ingest[/ingest proxy] --> posthog[(PostHog project)]

  subgraph legal [Revsnap legal track]
    login[Authenticated user] --> serverPrefetch[Server prefetch user_privacy_preferences]
    serverPrefetch --> provider[PrivacyEnforcementProvider]
    provider -->|version mismatch| modal[ReConsentModal - non-dismissible]
    modal -->|I Accept| dbWrite[(user_privacy_preferences)]
  end
```



---

## Migration checklist for the Revsnap codebase

Tick these off in order. Each is a discrete PR-sized change.

### Track 1 (shared cookie / PostHog)

- Add `js-cookie` (and `@types/js-cookie`) if not already installed.
- Add `posthog-js` if not already installed.
- Create `src/lib/consent/consentStorage.ts` matching the reference implementation above (cookie name `forceweaver-consent`, domain auto-detect on `.forceweaver.com`, version `'1.0'`, 395-day expiry, localStorage backup at `forceweaver-consent-backup`).
- Migrate any existing `revsnap_privacy_v1` localStorage value into the new cookie on first boot, then delete the legacy key.
- Update PostHog `init()` config to match the table in **PostHog configuration** above. Opt out by default.
- Wire the consent provider so it calls `posthog.opt_in_capturing()` / `posthog.opt_out_capturing()` whenever `analytics` flips, and emits a one-shot `analytics_consent_accepted` event after the first opt-in.
- On app boot, if a valid cookie already exists, **skip the banner**. Only show the in-app cookie banner when no decision is present.
- Add `/ingest/static/:path`*, `/ingest/array/:path*`, `/ingest/:path*` rewrites in `next.config.ts` and set `skipTrailingSlashRedirect: true`.
- If Revsnap has middleware that handles host-based rewrites or redirects, **add `/ingest` to its short-circuit list** so PostHog requests are never intercepted.
- Update `.env.example` / Vercel project env with the variables listed in **Required environment variables**.
- Add a "Cookie settings" entry in the dashboard footer / account settings so authenticated users can withdraw or grant analytics consent without clearing site data. Writing to the shared cookie automatically propagates the new decision to the marketing site.
- Verify on `localhost`: cookie is host-only with no domain.
- Verify on preview deploys (e.g. `revsnap-pr-123.vercel.app`): `NEXT_PUBLIC_COOKIE_DOMAIN` should be **empty**, so cookies do not leak to `.forceweaver.com`.
- Verify on production (`revsnap.forceweaver.com`): cookie domain is `.forceweaver.com` and visible in DevTools under both `forceweaver.com` and `revsnap.forceweaver.com`.

### Track 2 (authenticated legal acceptance)

- Create migration `supabase/migrations/020_user_privacy_preferences.sql` with the table, RLS policies, `handle_new_user()` trigger update, and the backfill insert for existing users.
- Create migration `supabase/migrations/030_app_legal_publish.sql` with the single-row table, RLS, and the initial `(1, '<current version>')` row.
- Add `NEXT_PUBLIC_PRIVACY_VERSION` to Vercel and `.env.local`. **It must equal `app_legal_publish.privacy_terms_version` for the same release.**
- Implement `src/lib/privacy/version.ts` with `getRequiredPrivacyVersion()` and `isPrivacyVersionSatisfied(accepted: string | null)`.
- Implement `src/lib/privacy/server.ts` for server-only reads of the current user's row.
- Implement `PrivacyEnforcementProvider` (TanStack Query cache `['privacy-preferences', userId]`).
- Implement `ReConsentModal` (non-dismissible, backdrop blur, "I Accept" writes via Supabase browser client).
- Wrap authenticated route groups (dashboard layout + billing layout if separate) with the provider.
- Document the legal release process in the Revsnap README so engineering knows to bump the env var and the DB row in the same PR.

### Acceptance tests

1. **Cross-domain accept:** Open `https://forceweaver.com` in a fresh incognito window. Click "Accept All" on the banner. Navigate to `https://revsnap.forceweaver.com/`. **No banner appears.** Check DevTools: `posthog.has_opted_in_capturing()` returns `true`.
2. **Cross-domain decline:** Repeat with "Essential Only". On Revsnap, `posthog.has_opted_out_capturing()` returns `true` and no PostHog network calls occur in the Network tab.
3. **Withdraw from Revsnap:** Log in to Revsnap, open Cookie Settings, toggle Analytics off, save. Navigate back to `https://forceweaver.com`. `posthog.has_opted_out_capturing()` is `true` on the marketing site.
4. **Version bump:** Bump `CONSENT_VERSION` from `'1.0'` to `'2.0'` in both apps. Every user sees a fresh banner on the next visit.
5. **Legal bump (Revsnap only):** Bump `NEXT_PUBLIC_PRIVACY_VERSION` and the DB row in the same release. Existing logged-in Revsnap users see the non-dismissible modal until they accept. Cookie consent state is unaffected.
6. **New signup:** Sign up a fresh user on Revsnap. `user_privacy_preferences.accepted_policy_version` is seeded from `app_legal_publish`. No re-consent modal appears unless the env var has since been bumped past that version.
7. **Local dev:** On `localhost:3000`, the cookie is host-only (no `.forceweaver.com` leakage). Banner works normally.

---

## Boundaries and gotchas

- **Cookies cannot bridge to `app.forceweaver.com` automatically.** The leading-dot `.forceweaver.com` domain covers every subdomain (`revsnap.`, `blog.`, `app.`, …). If you ever add a property on a different apex (e.g. `forceweaver.app`), it gets a **separate** consent decision.
- **Stripe, Supabase, and any other vendor cookies remain unchanged.** They are scoped to their own hosts; they are not affected by `NEXT_PUBLIC_COOKIE_DOMAIN`. Continue to declare them in your own cookie registry as `essential` when they back authentication or payments.
- **Do not log the cookie's contents to PostHog as a property bag.** It contains `timestamp` and `expiresAt` which are not useful as analytics dimensions. If you need a "consent state" property, derive a small string like `'all'` / `'analytics-only'` / `'essential-only'`.
- **Do not call `posthog.identify(userId)` before the user has logged in.** And only call it if `analytics` consent is `true`. If analytics consent is later withdrawn, call `posthog.reset()` to drop the linkage.
- **Legal acceptance is per-user, not per-cookie.** A user logged in on two devices sees the re-consent modal on each device until accepted, because acceptance is keyed off `auth.uid()`, not the browser cookie.

---

## Reference: how forceweaver-web implements Track 1


| Concern                                        | File                                              |
| ---------------------------------------------- | ------------------------------------------------- |
| PostHog browser init                           | `apps/web/lib/analytics/initPosthogBrowser.ts`    |
| Consent → PostHog bridge                       | `apps/web/components/consent/Analytics.tsx`       |
| Cookie storage                                 | `apps/web/lib/consent/consentStorage.ts`          |
| Cookie registry / version                      | `apps/web/lib/consent/cookieRegistry.ts`          |
| Banner UI                                      | `apps/web/components/consent/CookieBanner.tsx`    |
| Settings modal                                 | `apps/web/components/consent/CookieSettings.tsx`  |
| Provider                                       | `apps/web/components/consent/ConsentProvider.tsx` |
| Next.js rewrites / `skipTrailingSlashRedirect` | `apps/web/next.config.ts`                         |
| Middleware `/ingest` short-circuit             | `apps/web/middleware.ts`                          |
| Cookie policy page                             | `apps/web/app/cookie-policy/page.tsx`             |


When in doubt, mirror these files in the Revsnap codebase exactly. The shapes (cookie name, version, payload, expiry) are part of the **contract** between the two apps — they must agree byte-for-byte.

---

## Out of scope for this document

- Engagement scoring and ghost-lead capture. Those are Revsnap-internal product concerns and should remain in the Revsnap codebase only. They depend on `analytics` consent being `true` in the shared cookie, but the marketing site does not need to know they exist.
- App-specific PostHog events (signups, paywall, upgrades). Define them in the Revsnap product code; only consent gating is shared.
- Stripe checkout cookies. Stripe sets its own host-scoped cookies (`__stripe_mid`, `__stripe_sid`). Document them in Revsnap's own cookie registry; they are not part of the shared contract.


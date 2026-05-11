# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-05-11

### Security

- Upgrade Next.js from 15.5.3 to **15.5.18** (patches [CVE-2025-66478](https://nextjs.org/blog/CVE-2025-66478) and related advisories). Align `eslint-config-next` and workspace `next` semver ranges so Vercel no longer blocks deployment on vulnerable framework builds.

## [1.0.1] - 2026-05-11

### Changed

- Patch release after marketing-site cleanup: extension and SaaS surfaces removed, static Next.js app with `forceweaver.com` + `blog.forceweaver.com` routing, draft post handling, and workspace version alignment.

## [1.0.0] - 2026-05-11

### Added

- Initial `forceweaver-web` monorepo versioning for the lean marketing site and blog.

import Link from 'next/link';
import CompanyHeader from '../components/CompanyHeader';

const APP_URL = 'https://app.forceweaver.com';
const REVCLOUD_BLUEPRINT_URL =
  'https://marketplace.visualstudio.com/items?itemName=forceweaver.revcloud-blueprint';
const CML_DEPLOYER_URL =
  'https://marketplace.visualstudio.com/items?itemName=forceweaver.cml-migrator-advanced';
const blogUrl = process.env.NEXT_PUBLIC_BLOG_URL ?? 'https://blog.forceweaver.com';

const solutions = [
  {
    href: APP_URL,
    external: false,
    badge: 'Free web app',
    title: 'ForceWeaver App',
    tagline: 'A browser-based toolkit for Salesforce Core Cloud and Revenue Cloud practitioners.',
    bullets: [
      'Revenue Cloud tools: Product Hierarchy Viewer, Catalog Viewer, Pricing Process Debugger, Health Check, and more.',
      'Core Cloud tools: Access Analyzer for field and object permission tracing.',
      'No install needed—open in the browser and get oriented immediately.',
    ],
    cta: 'Open the app',
  },
  {
    href: REVCLOUD_BLUEPRINT_URL,
    external: true,
    badge: 'VS Code · Free',
    title: 'RevCloud Blueprint',
    tagline: 'Revenue Cloud pricing test automation, built for the real complexity of the platform.',
    bullets: [
      'Validates complex multi-tier, multi-currency, and bundle pricing scenarios with confidence.',
      'Enterprise-grade retry logic designed for Salesforce\'s asynchronous pricing engine.',
      'Git-integrated snapshot management for seamless CI/CD pipeline coverage.',
    ],
    cta: 'Install from Marketplace',
  },
  {
    href: CML_DEPLOYER_URL,
    external: true,
    badge: 'VS Code · Free',
    title: 'CML Deployer',
    tagline: 'Migrate Advanced Configurator setups between Salesforce orgs from inside VS Code.',
    bullets: [
      'Automates the full ExpressionSet migration including CML scripts, lookup data, and relationships.',
      'Intelligent ID resolution across orgs with automated conflict cleanup.',
      'Resumable migrations—re-run after a network failure and pick up from the last successful step.',
    ],
    cta: 'Install from Marketplace',
  },
] as const;

function SolutionCard({
  href,
  external,
  badge,
  title,
  tagline,
  bullets,
  cta,
}: (typeof solutions)[number]) {
  const linkClass =
    'glass-card group relative flex h-full flex-col rounded-xl p-8 transition duration-200 hover:-translate-y-0.5 hover:border-celestial-blue/30 hover:shadow-xl focus-within:ring-2 focus-within:ring-celestial-blue focus-within:ring-offset-2 motion-reduce:hover:translate-y-0 motion-reduce:transition-none';

  const inner = (
    <>
      <span className="mb-3 inline-flex w-fit rounded-full bg-celestial-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-celestial-blue">
        {badge}
      </span>
      <h3 className="text-xl font-bold text-indigo-dye">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-indigo-dye/75">{tagline}</p>
      <ul className="mt-4 flex-1 space-y-2.5 text-sm text-indigo-dye/80">
        {bullets.map((line) => (
          <li key={line} className="flex gap-2.5">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-celestial-blue"
              aria-hidden
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <span className="btn-primary-sm mt-8 w-full sm:w-auto">{cta}</span>
    </>
  );

  return (
    <a
      href={href}
      className={linkClass}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {inner}
    </a>
  );
}

export default function CompanyHome() {
  return (
    <>
      <CompanyHeader />
      <main className="bg-gradient-to-b from-lavender-blush/20 via-white to-slate-50/60">

        {/* ── Hero ── */}
        <section
          className="relative overflow-hidden py-20 md:py-32"
          aria-labelledby="hero-heading"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,161,224,0.10),transparent)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-32 top-1/4 h-72 w-72 rounded-full bg-celestial-blue/5 blur-3xl motion-reduce:hidden"
            aria-hidden
          />
          <div className="container relative mx-auto max-w-4xl px-6 text-center">
            <span className="inline-block rounded-full bg-celestial-blue/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-celestial-blue">
              Salesforce Revenue Cloud &amp; Core Cloud
            </span>
            <h1
              id="hero-heading"
              className="mt-5 text-4xl font-extrabold leading-tight text-indigo-dye md:text-5xl md:leading-tight"
            >
              Purpose-built tools for<br className="hidden sm:block" /> Salesforce practitioners
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-indigo-dye/75">
              ForceWeaver is a product brand focused entirely on the Salesforce platform. We ship a free
              web app toolkit, and two VS Code extensions that automate the hard parts of Revenue Cloud
              pricing and Advanced Configurator migrations.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
              <a href={APP_URL} className="btn-primary w-full min-w-[200px] sm:w-auto">
                Open ForceWeaver App
              </a>
              <Link href="/#products" className="btn-secondary w-full min-w-[200px] sm:w-auto">
                Explore all solutions
              </Link>
              <a
                href={blogUrl}
                className="text-base font-semibold text-celestial-blue underline-offset-4 transition hover:underline"
              >
                Read the blog
              </a>
            </div>
          </div>
        </section>

        {/* ── Value props band ── */}
        <section
          className="border-y border-gray-200/60 bg-white/90 py-14 md:py-20"
          aria-labelledby="pillars-heading"
        >
          <div className="container mx-auto max-w-6xl px-6">
            <h2 id="pillars-heading" className="sr-only">
              Why ForceWeaver
            </h2>
            <div className="grid gap-10 md:grid-cols-3 md:gap-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-celestial-blue">
                  Free web toolkit
                </p>
                <p className="mt-2 text-lg font-bold text-indigo-dye">
                  Instant insight, no install
                </p>
                <p className="mt-2 text-sm leading-relaxed text-indigo-dye/70">
                  The ForceWeaver App opens in any browser. Seven specialised tools cover Revenue Cloud
                  object hierarchies, pricing debugging, health checks, and Core Cloud access tracing—all
                  without touching your project folder.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-celestial-blue">
                  Pricing confidence
                </p>
                <p className="mt-2 text-lg font-bold text-indigo-dye">
                  Test the full pricing lifecycle
                </p>
                <p className="mt-2 text-sm leading-relaxed text-indigo-dye/70">
                  RevCloud Blueprint is a VS Code extension with deep specialisation in Revenue Cloud
                  pricing. Validate multi-currency bundles, generate stakeholder reports, and integrate
                  with CI/CD—all from your editor.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-celestial-blue">
                  Migration automation
                </p>
                <p className="mt-2 text-lg font-bold text-indigo-dye">
                  Move CML between orgs safely
                </p>
                <p className="mt-2 text-sm leading-relaxed text-indigo-dye/70">
                  The CML Deployer VS Code extension automates every step of an Advanced Configurator
                  migration—ExpressionSet, related records, lookup resolution—with a resumable workflow
                  so a failed network call never means starting over.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Solutions grid ── */}
        <section id="products" className="scroll-mt-20 py-16 md:py-24">
          <div className="container mx-auto px-6">
            <h2 className="text-center text-3xl font-bold text-indigo-dye">Solutions</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-indigo-dye/70">
              Three products, one brand. Each is free and ships to where you already work—browser or
              VS Code.
            </p>
            <div className="mx-auto mt-12 grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">
              {solutions.map((s) => (
                <SolutionCard key={s.title} {...s} />
              ))}
            </div>
          </div>
        </section>

        {/* ── About ── */}
        <section id="about" className="scroll-mt-20 bg-slate-50 py-16 md:py-24">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-bold text-indigo-dye">About ForceWeaver</h2>
            <p className="mt-6 leading-relaxed text-indigo-dye/80">
              ForceWeaver is a focused product brand for the Salesforce platform. Everything we build
              targets the same audience: practitioners working in Revenue Cloud and Core Cloud who need
              sharper tools than the defaults provide.
            </p>
            <p className="mt-4 leading-relaxed text-indigo-dye/80">
              The free web app covers day-to-day visibility and debugging. The VS Code extensions handle
              the automation work that no one wants to do by hand—pricing test suites and
              org-to-org migrations. Together they express one philosophy:{' '}
              <strong className="font-semibold text-indigo-dye">
                reduce the manual toil, surface the important signals, ship with confidence.
              </strong>
            </p>
            <p className="mt-4 leading-relaxed text-indigo-dye/80">
              For architecture deep-dives, billing edge cases, and updates, follow the blog.
            </p>
            <a
              href={blogUrl}
              className="mt-6 inline-flex font-semibold text-celestial-blue underline-offset-4 transition hover:underline"
            >
              Visit the blog →
            </a>
          </div>
        </section>

        {/* ── Pre-footer CTA ── */}
        <section
          className="border-t border-gray-200/60 bg-white py-16 md:py-20"
          aria-labelledby="cta-heading"
        >
          <div className="container mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
            <h2
              id="cta-heading"
              className="text-2xl font-bold text-indigo-dye md:text-3xl"
            >
              Start with the app, extend with VS Code
            </h2>
            <p className="mt-4 max-w-xl text-base text-indigo-dye/70">
              Most practitioners open the web app first for discovery and health checks, then add a VS
              Code extension when they need automation or migration workflows.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
              <a href={APP_URL} className="btn-primary">
                Open ForceWeaver App
              </a>
              <Link href="/#products" className="btn-secondary">
                View all solutions
              </Link>
            </div>
            <p className="mt-6 text-sm text-indigo-dye/55">
              Want the long read?{' '}
              <a href={blogUrl} className="font-medium text-celestial-blue hover:underline">
                Visit the blog
              </a>
              .
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

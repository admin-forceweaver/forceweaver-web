import Link from 'next/link';
import CompanyHeader from '../components/CompanyHeader';

const APP_URL = 'https://app.forceweaver.com';
const REVSNAP_URL = 'https://revsnap.forceweaver.com';
const MARKETPLACE_URL = 'https://marketplace.visualstudio.com/publishers/forceweaver';
const blogUrl = process.env.NEXT_PUBLIC_BLOG_URL ?? 'https://blog.forceweaver.com';

const solutions = [
  {
    href: APP_URL,
    external: false,
    badge: 'Free',
    title: 'ForceWeaver App',
    tagline: 'Explore Revenue Cloud metadata and pricing context in one place.',
    bullets: [
      'Purpose-built views for practitioners shipping CPQ and Billing work.',
      'No install—open in the browser and get oriented fast.',
      'Complements how your team already works in Salesforce.',
    ],
    cta: 'Open the app',
  },
  {
    href: REVSNAP_URL,
    external: false,
    badge: 'B2B SaaS',
    title: 'RevSnap',
    tagline: 'Operational control for Revenue Cloud deployments and change.',
    bullets: [
      'Align teams around what is changing, where, and why.',
      'Reduce risk when pricing, quoting, and billing logic moves.',
      'Built for the same practitioners who live in Revenue Cloud.',
    ],
    cta: 'Go to RevSnap',
  },
  {
    href: MARKETPLACE_URL,
    external: true,
    badge: 'VS Code',
    title: 'Editor extension',
    tagline: 'Install ForceWeaver from the Visual Studio Marketplace.',
    bullets: [
      'Bring Revenue Cloud context next to your repo and metadata.',
      'Fits into your existing VS Code workflow.',
      'Published and updated on the Marketplace.',
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
    'glass-card group relative flex h-full flex-col rounded-xl p-8 transition duration-200 hover:-translate-y-0.5 hover:border-celestial-blue/30 hover:shadow-lg focus-within:ring-2 focus-within:ring-celestial-blue focus-within:ring-offset-2 motion-reduce:hover:translate-y-0 motion-reduce:transition-none';

  const inner = (
    <>
      <span className="mb-3 inline-flex w-fit rounded-full bg-indigo-dye/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-celestial-blue">
        {badge}
      </span>
      <h3 className="text-xl font-bold text-indigo-dye">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-indigo-dye/75">{tagline}</p>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-indigo-dye/80">
        {bullets.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-celestial-blue" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <span className="btn-primary-sm mt-8 w-full sm:w-auto">{cta}</span>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        className={linkClass}
        target="_blank"
        rel="noopener noreferrer"
      >
        {inner}
      </a>
    );
  }

  return (
    <a href={href} className={linkClass}>
      {inner}
    </a>
  );
}

export default function CompanyHome() {
  return (
    <>
      <CompanyHeader />
      <main className="bg-gradient-to-b from-lavender-blush/25 via-white to-slate-50/80">
        <section
          className="relative overflow-hidden scroll-mt-20 py-20 md:py-28"
          aria-labelledby="hero-heading"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,161,224,0.12),transparent)]"
            aria-hidden
          />
          <div className="pointer-events-none absolute -right-24 top-1/4 h-64 w-64 rounded-full bg-celestial-blue/5 blur-3xl motion-reduce:hidden" aria-hidden />
          <div className="container relative mx-auto max-w-4xl px-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-celestial-blue">
              Salesforce Revenue Cloud
            </p>
            <h1 id="hero-heading" className="mt-4 text-4xl font-extrabold leading-tight text-indigo-dye md:text-5xl md:leading-tight">
              ForceWeaver — tools practitioners trust to ship change
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-indigo-dye/80">
              We build a free web app, RevSnap for B2B teams, and a VS Code extension so you can move from
              discovery to deployment without losing the thread. Pick the surface that matches how you work today.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
              <a href={APP_URL} className="btn-primary w-full min-w-[200px] sm:w-auto">
                Open ForceWeaver App
              </a>
              <Link href="/#products" className="btn-secondary w-full min-w-[200px] sm:w-auto">
                View solutions
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

        <section className="border-y border-gray-200/60 bg-white/80 py-16 md:py-20" aria-labelledby="pillars-heading">
          <div className="container mx-auto max-w-6xl px-6">
            <h2 id="pillars-heading" className="sr-only">
              Why ForceWeaver
            </h2>
            <div className="grid gap-10 md:grid-cols-3 md:gap-8">
              <div className="text-center md:text-left">
                <p className="text-sm font-semibold uppercase tracking-wide text-celestial-blue">Free app</p>
                <p className="mt-2 text-lg font-bold text-indigo-dye">Clarity without setup</p>
                <p className="mt-2 text-sm leading-relaxed text-indigo-dye/75">
                  Open the hosted app when you need a fast, opinionated lens on Revenue Cloud—ideal for discovery
                  and day-to-day checks.
                </p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm font-semibold uppercase tracking-wide text-celestial-blue">RevSnap</p>
                <p className="mt-2 text-lg font-bold text-indigo-dye">Control for serious change</p>
                <p className="mt-2 text-sm leading-relaxed text-indigo-dye/75">
                  When deployments and org-wide updates need coordination, RevSnap is the B2B surface built for
                  operators and leads who own the outcome.
                </p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm font-semibold uppercase tracking-wide text-celestial-blue">VS Code</p>
                <p className="mt-2 text-lg font-bold text-indigo-dye">In flow with developers</p>
                <p className="mt-2 text-sm leading-relaxed text-indigo-dye/75">
                  Install from the Marketplace to keep Revenue Cloud signals beside your code, diffs, and scratch
                  work—without switching contexts.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="products" className="scroll-mt-20 py-16 md:py-24">
          <div className="container mx-auto px-6">
            <h2 className="text-center text-3xl font-bold text-indigo-dye">Solutions</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-indigo-dye/75">
              Each product has its own home—jump in from here, then bookmark where you spend your time.
            </p>
            <div className="mx-auto mt-12 grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">
              {solutions.map((s) => (
                <SolutionCard key={s.title} {...s} />
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-20 bg-slate-50 py-16 md:py-24">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-bold text-indigo-dye">About ForceWeaver</h2>
            <p className="mt-6 leading-relaxed text-indigo-dye/80">
              ForceWeaver is a focused product company for Salesforce Revenue Cloud. The free app helps you see and
              reason about the platform quickly. RevSnap is where teams run tighter deployment and change programs.
              The VS Code extension meets developers where they already work. Together they express one brand:{' '}
              <strong className="font-semibold text-indigo-dye">practical tools, clear UX, and respect for how hard
              this domain is.</strong>
            </p>
            <p className="mt-4 leading-relaxed text-indigo-dye/80">
              For deep dives—architecture, billing edge cases, and release notes—follow the blog. It is the best place
              to watch how our thinking evolves.
            </p>
          </div>
        </section>

        <section className="border-t border-gray-200/60 bg-white py-16 md:py-20" aria-labelledby="cta-heading">
          <div className="container mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
            <h2 id="cta-heading" className="text-2xl font-bold text-indigo-dye md:text-3xl">
              Start with the free app—or explore every solution above
            </h2>
            <p className="mt-4 max-w-xl text-indigo-dye/75">
              Most visitors begin in the hosted app. When you are ready for team-wide workflows or editor-native
              work, the other cards are one click away.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
              <a href={APP_URL} className="btn-primary">
                Open ForceWeaver App
              </a>
              <Link href="/#products" className="btn-secondary">
                Back to solutions
              </Link>
            </div>
            <p className="mt-6 text-sm text-indigo-dye/60">
              Prefer long-form updates?{' '}
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

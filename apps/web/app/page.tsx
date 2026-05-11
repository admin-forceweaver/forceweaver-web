import CompanyHome from '@domains/company/pages/HomePage';
import Footer from '@/app/components/Footer';
import { generateHomePageJsonLdGraph, generateMetadata as buildMeta } from '@/lib/seo';
import { siteOrigin } from '@/lib/site';

const defaultOg = '/forceweaver-logo.png';
/** Add `apps/web/public/og-home.png` (1200×630) and set NEXT_PUBLIC_OG_HOME_IMAGE=/og-home.png for social previews. */
const ogHomeImage = process.env.NEXT_PUBLIC_OG_HOME_IMAGE ?? defaultOg;

export const metadata = buildMeta({
  title: 'ForceWeaver — Revenue Cloud app, RevSnap & VS Code',
  description:
    'ForceWeaver is the brand home for Salesforce Revenue Cloud tools: the free ForceWeaver App, RevSnap B2B SaaS, and a VS Code extension from the Marketplace—plus the blog for practitioners.',
  keywords: [
    'ForceWeaver',
    'Salesforce Revenue Cloud',
    'CPQ',
    'Salesforce Billing',
    'RevSnap',
    'ForceWeaver App',
    'VS Code',
    'Visual Studio Marketplace',
  ],
  canonical: `${siteOrigin()}/`,
  ogImage: ogHomeImage,
});

export default function HomePage() {
  const homeJsonLd = generateHomePageJsonLdGraph();

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <CompanyHome />
      <div className="mt-auto">
        <Footer variant="company" />
      </div>
    </div>
  );
}

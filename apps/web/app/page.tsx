import CompanyHome from '@domains/company/pages/HomePage';
import Footer from '@/app/components/Footer';
import { generateHomePageJsonLdGraph, generateMetadata as buildMeta } from '@/lib/seo';
import { siteOrigin } from '@/lib/site';

const defaultOg = '/forceweaver-logo.png';
/** Add `apps/web/public/og-home.png` (1200×630) and set NEXT_PUBLIC_OG_HOME_IMAGE=/og-home.png for social previews. */
const ogHomeImage = process.env.NEXT_PUBLIC_OG_HOME_IMAGE ?? defaultOg;

export const metadata = buildMeta({
  title: 'ForceWeaver — Salesforce Revenue Cloud & Core Cloud tools',
  description:
    'ForceWeaver builds free tools for Salesforce practitioners: a browser-based toolkit for Revenue Cloud and Core Cloud, plus two VS Code extensions—RevCloud Blueprint for pricing test automation and CML Deployer for Advanced Configurator migrations.',
  keywords: [
    'ForceWeaver',
    'Salesforce Revenue Cloud',
    'Salesforce CPQ',
    'Salesforce Billing',
    'Advanced Configurator',
    'CML migrator',
    'RevCloud Blueprint',
    'Revenue Cloud pricing',
    'ForceWeaver App',
    'VS Code Salesforce extension',
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

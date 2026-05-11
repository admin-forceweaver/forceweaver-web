import CompanyHome from '@domains/company/pages/HomePage';
import Footer from '@/app/components/Footer';
import { generateMetadata as buildMeta } from '@/lib/seo';
import { siteOrigin } from '@/lib/site';

export const metadata = buildMeta({
  title: 'Home',
  description:
    'ForceWeaver builds focused Salesforce Revenue Cloud tools—apps, extensions, and practical content for practitioners.',
  canonical: `${siteOrigin()}/`,
});

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <CompanyHome />
      <div className="mt-auto">
        <Footer variant="company" />
      </div>
    </div>
  );
}

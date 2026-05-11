import CompanyHeader from '@domains/company/components/CompanyHeader';
import Footer from '@/app/components/Footer';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <CompanyHeader />
      {children}
      <div className="mt-auto">
        <Footer variant="company" />
      </div>
    </div>
  );
}

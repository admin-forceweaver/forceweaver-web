import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ConsentProvider } from '@/components/consent/ConsentProvider';
import { CookieBanner } from '@/components/consent/CookieBanner';
import { Analytics } from '@/components/consent/Analytics';

const inter = Inter({ subsets: ['latin'] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://forceweaver.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ForceWeaver',
    template: '%s | ForceWeaver',
  },
  description: 'Professional tools and insights for Salesforce Revenue Cloud teams.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-white text-indigo-dye antialiased`}>
        <ConsentProvider>
          {children}
          <CookieBanner />
          <Analytics />
        </ConsentProvider>
      </body>
    </html>
  );
}

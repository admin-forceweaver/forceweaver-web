'use client';

import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://forceweaver.com';
const blogUrl = process.env.NEXT_PUBLIC_BLOG_URL ?? 'https://blog.forceweaver.com';
const appUrl = 'https://app.forceweaver.com';

export default function CompanyHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href.includes('#')) return false;
    try {
      return new URL(href).pathname === pathname;
    } catch {
      return pathname === href;
    }
  };

  return (
    <header className="glass-header sticky top-0 z-50 border-b border-gray-200/50">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Image
            src="/forceweaver-logo.png"
            alt="ForceWeaver"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <a
            href={siteUrl}
            className="text-xl font-bold text-indigo-dye hover:text-celestial-blue transition-colors"
          >
            ForceWeaver
          </a>
        </div>

        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          <a
            href={`${siteUrl}/#products`}
            className="text-indigo-dye font-medium hover:text-celestial-blue transition-colors"
          >
            Solutions
          </a>
          <a
            href={`${siteUrl}/#about`}
            className="text-indigo-dye font-medium hover:text-celestial-blue transition-colors"
          >
            About
          </a>
          <a
            href={blogUrl}
            className="font-medium text-indigo-dye hover:text-celestial-blue transition-colors"
          >
            Blog
          </a>
          <a href={appUrl} className="btn-primary-sm shrink-0">
            Open app
          </a>
        </nav>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-indigo-dye hover:text-celestial-blue transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-md">
          <nav className="container mx-auto px-6 py-4 flex flex-col space-y-4">
            <a
              href={`${siteUrl}/#products`}
              className="text-indigo-dye font-medium hover:text-celestial-blue transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Solutions
            </a>
            <a
              href={`${siteUrl}/#about`}
              className="text-indigo-dye font-medium hover:text-celestial-blue transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </a>
            <a
              href={blogUrl}
              className={`font-medium hover:text-celestial-blue transition-colors ${
                isActive(blogUrl) ? 'text-celestial-blue' : 'text-indigo-dye'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Blog
            </a>
            <a
              href={appUrl}
              className="btn-primary-sm w-fit"
              onClick={() => setMobileMenuOpen(false)}
            >
              Open app
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

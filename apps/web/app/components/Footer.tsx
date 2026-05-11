'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CookieSettings } from '@/components/consent/CookieSettings';

const blogUrl = process.env.NEXT_PUBLIC_BLOG_URL ?? 'https://blog.forceweaver.com';

interface FooterProps {
  variant?: 'product' | 'company';
}

export default function Footer({ variant = 'company' }: FooterProps) {
  const [showCookieSettings, setShowCookieSettings] = useState(false);

  return (
    <>
      <footer className="bg-white border-t border-gray-200/50">
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-indigo-dye mb-3">ForceWeaver</h3>
              <p className="text-sm text-indigo-dye/60">
                Brand home for ForceWeaver—apps, RevSnap, and the VS Code extension for Revenue Cloud teams.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-indigo-dye mb-3">
                {variant === 'product' ? 'Product' : 'Solutions'}
              </h4>
              <ul className="space-y-2 text-sm text-indigo-dye/60">
                <li>
                  <Link href="/" className="hover:text-celestial-blue transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <a
                    href="https://app.forceweaver.com"
                    className="hover:text-celestial-blue transition-colors"
                  >
                    ForceWeaver App
                  </a>
                </li>
                <li>
                  <a
                    href="https://revsnap.forceweaver.com"
                    className="hover:text-celestial-blue transition-colors"
                  >
                    RevSnap
                  </a>
                </li>
                <li>
                  <a
                    href="https://marketplace.visualstudio.com/publishers/forceweaver"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-celestial-blue transition-colors"
                  >
                    Install VS Code extension
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-indigo-dye mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-indigo-dye/60">
                <li>
                  <a href={blogUrl} className="hover:text-celestial-blue transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <Link href="/#about" className="hover:text-celestial-blue transition-colors">
                    About
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-indigo-dye mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-indigo-dye/60">
                <li>
                  <Link href="/cookie-policy" className="hover:text-celestial-blue transition-colors">
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setShowCookieSettings(true)}
                    className="hover:text-celestial-blue transition-colors text-left"
                  >
                    Cookie Settings
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200/50 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-indigo-dye/60">
            <p>&copy; {new Date().getFullYear()} ForceWeaver. All rights reserved.</p>
            <p className="mt-2 md:mt-0">Built for Revenue Cloud teams</p>
          </div>
        </div>
      </footer>

      {showCookieSettings && <CookieSettings onClose={() => setShowCookieSettings(false)} />}
    </>
  );
}

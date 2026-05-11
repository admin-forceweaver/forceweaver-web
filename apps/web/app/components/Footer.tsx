'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CookieSettings } from '@/components/consent/CookieSettings';

interface FooterProps {
  variant?: 'product' | 'company';
}

export default function Footer({ variant = 'product' }: FooterProps) {
  const [showCookieSettings, setShowCookieSettings] = useState(false);

  return (
    <>
      <footer className="bg-white border-t border-gray-200/50">
        <div className="container mx-auto px-6 py-8">
          {/* Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div>
              <h3 className="font-bold text-indigo-dye mb-3">Forceweaver</h3>
              <p className="text-sm text-indigo-dye/60">
                Professional tools for Salesforce Revenue Cloud development.
              </p>
            </div>

            {/* Product/Solutions */}
            <div>
              <h4 className="font-semibold text-indigo-dye mb-3">{variant === 'product' ? 'Product' : 'Solutions'}</h4>
              <ul className="space-y-2 text-sm text-indigo-dye/60">
                {variant === 'product' ? (
                  <>
                    <li><Link href="/" className="hover:text-celestial-blue transition-colors">Home</Link></li>
                    <li><Link href="/rcb-pricing" className="hover:text-celestial-blue transition-colors">Pricing</Link></li>
                    <li><a href="https://marketplace.visualstudio.com/items?itemName=forceweaver.revcloud-blueprint" target="_blank" rel="noopener noreferrer" className="hover:text-celestial-blue transition-colors">VS Code Marketplace</a></li>
                  </>
                ) : (
                  <>
                    <li><a href="https://blueprint.forceweaver.com" className="hover:text-celestial-blue transition-colors">Rev Cloud Blueprint</a></li>
                    <li><span className="text-indigo-dye/40">Forceweaver App (Coming Soon)</span></li>
                    <li><span className="text-indigo-dye/40">CML Deployer (Coming Soon)</span></li>
                  </>
                )}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold text-indigo-dye mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-indigo-dye/60">
                <li><Link href="/blog" className="hover:text-celestial-blue transition-colors">Blog</Link></li>
                <li><Link href="/setup-instructions" className="hover:text-celestial-blue transition-colors">Documentation</Link></li>
                <li><a href="https://github.com/arohitu/revcloud-blueprint-extension" target="_blank" rel="noopener noreferrer" className="hover:text-celestial-blue transition-colors">GitHub</a></li>
                <li><Link href="/#about" className="hover:text-celestial-blue transition-colors">About</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-indigo-dye mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-indigo-dye/60">
                <li><Link href="/cookie-policy" className="hover:text-celestial-blue transition-colors">Cookie Policy</Link></li>
                <li>
                  <button
                    onClick={() => setShowCookieSettings(true)}
                    className="hover:text-celestial-blue transition-colors text-left"
                  >
                    Cookie Settings
                  </button>
                </li>
                <li><Link href="#" className="hover:text-celestial-blue transition-colors">Privacy</Link></li>
                <li><Link href="#" className="hover:text-celestial-blue transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-gray-200/50 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-indigo-dye/60">
            <p>&copy; 2025 Forceweaver. All rights reserved.</p>
            <p className="mt-2 md:mt-0">
              Made for Salesforce Revenue Cloud teams
            </p>
          </div>
        </div>
      </footer>

      {showCookieSettings && (
        <CookieSettings onClose={() => setShowCookieSettings(false)} />
      )}
    </>
  );
}

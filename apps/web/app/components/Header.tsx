'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="glass-header sticky top-0 z-50 border-b border-gray-200/50">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-celestial-blue rounded-lg flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
            </svg>
          </div>
          <Link href="/" className="text-xl font-bold text-indigo-dye hover:text-celestial-blue transition-colors">
            Rev Cloud Blueprint
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <a 
            href="https://forceweaver.com" 
            className="font-medium text-indigo-dye hover:text-celestial-blue transition-colors"
          >
            Home
          </a>
          <Link 
            href="/setup-instructions" 
            className={`font-medium hover:text-celestial-blue transition-colors ${
              isActive('/setup-instructions') ? 'text-celestial-blue' : 'text-indigo-dye'
            }`}
          >
            Documentation
          </Link>
          <Link 
            href="/rcb-pricing" 
            className={`font-medium hover:text-celestial-blue transition-colors ${
              isActive('/rcb-pricing') ? 'text-celestial-blue' : 'text-indigo-dye'
            }`}
          >
            Pricing
          </Link>
          <a 
            href="https://www.forceweaver.com/blog" 
            className="font-medium text-indigo-dye hover:text-celestial-blue transition-colors"
          >
            Blog
          </a>
        </nav>
        
        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/login" className="text-indigo-dye hover:text-celestial-blue font-medium transition-colors">Sign In</Link>
          <a href="https://marketplace.visualstudio.com/items?itemName=forceweaver.revcloud-blueprint" 
             target="_blank" 
             rel="noopener noreferrer"
             className="bg-celestial-blue text-white px-5 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity shadow-sm">
            Install Free
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-md">
          <nav className="container mx-auto px-6 py-4 flex flex-col space-y-4">
            <a 
              href="https://forceweaver.com" 
              className="font-medium text-indigo-dye hover:text-celestial-blue transition-colors"
            >
              Home
            </a>
            <Link 
              href="/setup-instructions" 
              className={`font-medium hover:text-celestial-blue transition-colors ${
                isActive('/setup-instructions') ? 'text-celestial-blue' : 'text-indigo-dye'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Documentation
            </Link>
            <Link 
              href="/rcb-pricing" 
              className={`font-medium hover:text-celestial-blue transition-colors ${
                isActive('/rcb-pricing') ? 'text-celestial-blue' : 'text-indigo-dye'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <a 
              href="https://www.forceweaver.com/blog" 
              className="font-medium text-indigo-dye hover:text-celestial-blue transition-colors"
            >
              Blog
            </a>
            <div className="border-t border-gray-200 pt-4 flex flex-col space-y-3">
              <Link 
                href="/login" 
                className="text-indigo-dye hover:text-celestial-blue font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
              <a 
                href="https://marketplace.visualstudio.com/items?itemName=forceweaver.revcloud-blueprint" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-celestial-blue text-white px-5 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity shadow-sm text-center"
              >
                Install Free
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

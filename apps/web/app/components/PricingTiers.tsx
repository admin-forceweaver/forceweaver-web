'use client';

import { useState } from 'react';

export default function PricingTiers() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const toggleBillingCycle = () => {
    setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly');
  };

  return (
    <div>
      {/* Monthly/Annual Toggle */}
      <div className="mt-10 flex justify-center items-center space-x-4">
        <span className="font-semibold text-indigo-dye/80">Monthly</span>
        <div 
          className={`toggle-switch ${billingCycle === 'annual' ? 'annual' : 'monthly'}`}
          onClick={toggleBillingCycle}
        >
          <div className="toggle-switch-slider"></div>
          <div className={`toggle-switch-option ${billingCycle === 'monthly' ? 'active' : ''}`}></div>
          <div className={`toggle-switch-option ${billingCycle === 'annual' ? 'active' : ''}`}></div>
        </div>
        <span className="font-semibold text-indigo-dye/80">Annual</span>
        <span className="ml-2 badge-purple">Save 20%</span>
      </div>

      {/* Pricing Table Section */}
      <section id="pricing" className="pb-12 md:pb-16 mt-10">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-8 items-start max-w-6xl mx-auto">

            {/* Free Plan */}
            <div className="bg-white p-6 rounded-xl border border-gray-200/50 shadow-md h-full flex flex-col">
              <h3 className="text-2xl font-bold text-indigo-dye">Free</h3>
              <p className="mt-2 text-indigo-dye/70">For individuals getting started with automated testing.</p>
              <div className="mt-6">
                <span className="text-4xl font-extrabold">$0</span>
                <span className="text-lg font-medium text-indigo-dye/60">/ forever</span>
              </div>
              <a href="https://marketplace.visualstudio.com/items?itemName=forceweaver.revcloud-blueprint" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="mt-8 w-full text-center bg-gray-100 text-indigo-dye px-6 py-3 rounded-md font-semibold hover:bg-gray-200 transition-all">
                Get Started
              </a>
              <ul className="mt-8 space-y-4 text-indigo-dye/80">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-celestial-blue mr-3 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  <span><span className="font-semibold">5</span> Pricing Snapshots</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-celestial-blue mr-3 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  <span>Individual Test Runs</span>
                </li>
              </ul>
            </div>
            
            {/* Pro Plan (Highlighted) */}
            <div className="bg-white p-6 rounded-xl border-2 border-celestial-blue shadow-xl h-full flex flex-col relative">
              <span className="absolute top-0 -translate-y-1/2 bg-celestial-blue text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Most Popular</span>
              <h3 className="text-2xl font-bold text-indigo-dye">Pro</h3>
              <p className="mt-2 text-indigo-dye/70">For professional teams who need unlimited testing and productivity features.</p>
              <div className="mt-6">
                <div className={billingCycle === 'monthly' ? '' : 'hidden'}>
                  <span className="text-4xl font-extrabold">$25</span>
                  <span className="text-lg font-medium text-indigo-dye/60">/ user / month</span>
                </div>
                <div className={billingCycle === 'annual' ? '' : 'hidden'}>
                  <span className="text-4xl font-extrabold">$20</span>
                  <span className="text-lg font-medium text-indigo-dye/60">/ user / month</span>
                </div>
              </div>
              <a href="#" className="mt-8 w-full text-center bg-celestial-blue text-white px-6 py-3 rounded-md font-semibold hover:opacity-90 transition-opacity">
                Upgrade to Pro
              </a>
              <ul className="mt-8 space-y-4 text-indigo-dye/80">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-celestial-blue mr-3 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  <span className="font-semibold">All Free features, plus:</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-celestial-blue mr-3 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  <span><span className="font-semibold">Unlimited</span> Pricing Snapshots</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-celestial-blue mr-3 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  <span><span className="font-semibold">Smart Group Management</span></span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-celestial-blue mr-3 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  <span>Batch Testing (Group Runs)</span>
                </li>
              </ul>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white p-6 rounded-xl border border-gray-200/50 shadow-md h-full flex flex-col">
              <h3 className="text-2xl font-bold text-indigo-dye">Enterprise</h3>
              <p className="mt-2 text-indigo-dye/70">For large organizations requiring advanced features and dedicated support.</p>
              <div className="mt-6">
                <span className="text-4xl font-extrabold">Let&apos;s Talk</span>
              </div>
              <a href="#" className="mt-8 w-full text-center bg-indigo-dye text-white px-6 py-3 rounded-md font-semibold hover:bg-indigo-dye/90 transition-all">
                Contact Sales
              </a>
              <div className="mt-2 text-center text-sm text-indigo-dye/60 font-semibold">COMING SOON</div>
              <ul className="mt-8 space-y-4 text-indigo-dye/80">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-celestial-blue mr-3 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  <span className="font-semibold">All Pro features, plus:</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-celestial-blue mr-3 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  <span>Team License Management</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

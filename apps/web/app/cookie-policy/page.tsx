import { Metadata } from 'next';
import { getCookiesByCategory } from '@/lib/consent/cookieRegistry';
import CompanyHeader from '@domains/company/components/CompanyHeader';
import Footer from '@/app/components/Footer';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How ForceWeaver sites use cookies and similar technologies.',
};

export default function CookiePolicyPage() {
  const essentialCookies = getCookiesByCategory('essential');
  const analyticsCookies = getCookiesByCategory('analytics');

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <CompanyHeader />
      <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Cookie Policy
        </h1>
        
        <p className="text-sm text-gray-500 mb-8">
          Last updated: October 11, 2025
        </p>

        {/* Introduction */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            What Are Cookies?
          </h2>
          <p className="text-gray-700 mb-4">
            Cookies are small text files that are placed on your device when you visit our website.
            They help us provide you with a better experience by remembering your preferences,
            enabling essential features, and helping us understand how you use our service.
          </p>
        </section>

        {/* How We Use Cookies */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            How We Use Cookies
          </h2>
          <p className="text-gray-700 mb-4">
            We use cookies for the following purposes:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Essential cookies:</strong> Required for the website to function properly</li>
            <li><strong>Analytics cookies:</strong> Help us understand how visitors use our website</li>
            <li><strong>Preference cookies:</strong> Remember your settings and preferences</li>
          </ul>
        </section>

        {/* Essential Cookies */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Essential Cookies
          </h2>
          <p className="text-gray-700 mb-4">
            These cookies are necessary for the website to function and cannot be switched off.
            They are usually set in response to actions you take, such as logging in or filling out forms.
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cookie Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purpose
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {essentialCookies.map((cookie) => (
                  <tr key={cookie.name}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {cookie.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {cookie.purpose}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {cookie.duration}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {cookie.provider}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Analytics Cookies */}
        {analyticsCookies.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Analytics Cookies
            </h2>
            <p className="text-gray-700 mb-4">
              These cookies help us understand how visitors interact with our website by collecting
              anonymous information. This data helps us improve the user experience.
            </p>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cookie Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purpose
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analyticsCookies.map((cookie) => (
                    <tr key={cookie.name}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {cookie.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {cookie.purpose}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {cookie.duration}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {cookie.provider}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Managing Cookies */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Managing Your Cookie Preferences
          </h2>
          <p className="text-gray-700 mb-4">
            You have full control over which cookies you allow. You can manage your preferences in several ways:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
            <li>Use our cookie consent banner when you first visit the site</li>
            <li>Click &quot;Cookie Settings&quot; in the footer to update your preferences at any time</li>
            <li>Configure your browser settings to block or delete cookies</li>
          </ul>
          <p className="text-gray-700">
            Please note that blocking essential cookies will prevent you from using certain features
            of our website, such as logging in or making purchases.
          </p>
        </section>

        {/* Third-Party Services */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Third-Party Services
          </h2>
          <p className="text-gray-700 mb-4">
            We use the following third-party services that may set cookies:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>
              <strong>Supabase:</strong> Authentication and database services
              {' '}(<a href="https://supabase.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>)
            </li>
            <li>
              <strong>Vercel Analytics:</strong> Website traffic analysis
              {' '}(<a href="https://vercel.com/legal/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>)
            </li>
          </ul>
        </section>

        {/* Future: Stripe */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Payment Processing (Stripe)
          </h2>
          <p className="text-gray-700 mb-4">
            When payment processing is enabled, we will use Stripe to handle transactions securely.
            Stripe may set cookies for fraud prevention and secure checkout. These cookies are
            essential for payment processing and cannot be disabled if you wish to make purchases.
          </p>
          <p className="text-gray-700">
            Learn more about Stripe&apos;s cookie usage in their{' '}
            <a href="https://stripe.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>.
          </p>
        </section>

        {/* Your Rights */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Your Rights
          </h2>
          <p className="text-gray-700 mb-4">
            Depending on your location, you may have rights regarding cookies and personal data:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>EU/UK (GDPR):</strong> Right to access, rectify, erase, and port your data</li>
            <li><strong>California (CCPA):</strong> Right to know, delete, and opt-out of data sales</li>
            <li><strong>Canada (PIPEDA):</strong> Right to access and correct your personal information</li>
            <li><strong>Brazil (LGPD):</strong> Right to access, correct, delete, and port your data</li>
          </ul>
        </section>

        {/* Contact */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Contact Us
          </h2>
          <p className="text-gray-700 mb-4">
            If you have any questions about our use of cookies, please contact us:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700">
              <strong>Email:</strong>{' '}
              <a href="mailto:privacy@forceweaver.com" className="text-blue-600 hover:underline">
                privacy@forceweaver.com
              </a>
            </p>
          </div>
        </section>

        {/* Links */}
        <section className="pt-8 border-t border-gray-200">
          <p className="text-gray-700">
            For more information about how we process your data, please read our{' '}
            <a href="/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>.
          </p>
        </section>
      </div>
      </div>
      <Footer variant="company" />
    </div>
  );
}


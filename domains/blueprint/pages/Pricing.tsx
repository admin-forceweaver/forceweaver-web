import type { Metadata } from "next";
import PricingTiers from "../components/PricingTiers";
import Header from "../components/Header";
import Footer from "@/../../packages/ui/components/Footer";
import { generateMetadata as genMeta } from "@/../../apps/web/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Pricing - Rev Cloud Blueprint",
  description: "Find the plan that's right for you. Start for free, then scale up as your team and testing needs grow. No contracts, no friction. Free tier available for beta users.",
  keywords: [
    "Rev Cloud Blueprint pricing",
    "Salesforce testing pricing",
    "Revenue Cloud testing plans",
    "free Salesforce testing",
    "enterprise Salesforce testing",
    "automated testing pricing",
  ],
  canonical: "https://blueprint.forceweaver.com/rcb-pricing",
});

export default function PricingPage() {
  return (
    <>
      <Header />
      <div>
      {/* Pricing Hero Section */}
      <section className="py-12 md:py-16 text-center">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-indigo-dye">
            Find the Plan That&apos;s Right for You
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-indigo-dye/70">
            Start for free, then scale up as your team and testing needs grow. No contracts, no friction.
          </p>

          {/* PricingTiers component includes the toggle and pricing cards */}
          <PricingTiers />
        </div>
      </section>
      </div>
      <Footer />
    </>
  );
}

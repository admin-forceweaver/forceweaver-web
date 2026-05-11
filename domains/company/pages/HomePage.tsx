import CompanyHeader from '../components/CompanyHeader';

export default function CompanyHome() {
  return (
    <>
      <CompanyHeader />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-20 md:py-28">
          <div className="container mx-auto px-6 text-center max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-celestial-blue mb-4">
              Salesforce Revenue Cloud
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-indigo-dye leading-tight">
              Professional tools for Revenue Cloud teams
            </h1>
            <p className="mt-6 text-lg text-indigo-dye/80 max-w-2xl mx-auto">
              ForceWeaver builds focused products—from extensions to hosted apps—so you can ship pricing,
              quoting, and billing changes with confidence.
            </p>
          </div>
        </section>

        <section id="products" className="py-16 md:py-24 bg-white scroll-mt-20">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-indigo-dye text-center mb-4">Solutions</h2>
            <p className="text-center text-indigo-dye/70 max-w-2xl mx-auto mb-12">
              Explore our products. Each runs on its own subdomain or distribution channel.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <a
                href="https://app.forceweaver.com"
                className="glass-card rounded-xl p-8 block hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-bold text-indigo-dye mb-2">ForceWeaver App</h3>
                <p className="text-indigo-dye/70 text-sm mb-4">Hosted application experience.</p>
                <span className="text-celestial-blue font-medium text-sm">Visit app.forceweaver.com →</span>
              </a>
              <a
                href="https://revsnap.forceweaver.com"
                className="glass-card rounded-xl p-8 block hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-bold text-indigo-dye mb-2">RevSnap</h3>
                <p className="text-indigo-dye/70 text-sm mb-4">Focused workflows for Revenue Cloud.</p>
                <span className="text-celestial-blue font-medium text-sm">Visit revsnap.forceweaver.com →</span>
              </a>
              <a
                href="https://marketplace.visualstudio.com/publishers/forceweaver"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card rounded-xl p-8 block hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-bold text-indigo-dye mb-2">VS Code extensions</h3>
                <p className="text-indigo-dye/70 text-sm mb-4">Editor tooling published on the Visual Studio Marketplace.</p>
                <span className="text-celestial-blue font-medium text-sm">View on Marketplace →</span>
              </a>
            </div>
          </div>
        </section>

        <section id="about" className="py-16 md:py-24 bg-slate-50 scroll-mt-20">
          <div className="container mx-auto px-6 max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-indigo-dye mb-4">About ForceWeaver</h2>
            <p className="text-indigo-dye/80 leading-relaxed">
              We help Salesforce Revenue Cloud practitioners move faster with opinionated tools, clear UX, and
              content that distills what matters on the platform. Read the latest on our blog for architecture notes,
              billing edge cases, and product updates.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

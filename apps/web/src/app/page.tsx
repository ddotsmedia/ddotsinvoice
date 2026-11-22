import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Home() {
  const cookieStore = await cookies();
  if (cookieStore.has('refresh_token')) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#2563EB" />
              <text x="6" y="23" fontFamily="sans-serif" fontWeight="bold" fontSize="16" fill="white">Di</text>
            </svg>
            <span className="text-lg font-bold tracking-tight">DdotsInvoice</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#features" className="hidden text-sm text-slate-300 hover:text-white sm:block">Features</Link>
            <Link href="#pricing" className="hidden text-sm text-slate-300 hover:text-white sm:block">Pricing</Link>
            <Link href="/login" className="text-sm text-slate-300 hover:text-white">Sign In</Link>
            <Link href="/register" className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-colors">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1 text-xs font-medium text-blue-400">
            Built for UAE Businesses
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Smart Invoicing &amp; Finance<br />
            <span className="text-[#2563EB]">for UAE Businesses</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400">
            Create VAT-compliant invoices, manage suppliers, track payroll — all in one platform built for the UAE.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/register" className="w-full rounded-xl bg-[#2563EB] px-8 py-4 text-base font-semibold text-white hover:bg-blue-600 transition-colors sm:w-auto">
              Start Free Trial
            </Link>
            <Link href="/login" className="w-full rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-colors sm:w-auto">
              Sign In
            </Link>
          </div>
          {/* Abstract visual */}
          <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-8">
            <div className="grid grid-cols-3 gap-4">
              {['AED 24,500', 'AED 8,200', 'AED 3,750'].map((amount, i) => (
                <div key={i} className="rounded-lg bg-white/5 p-4 text-left">
                  <div className="mb-1 text-xs text-slate-500">{['Total Revenue', 'Outstanding', 'This Month'][i]}</div>
                  <div className="text-lg font-bold text-white">{amount}</div>
                  <div className="mt-1 text-xs text-green-400">+{[12, 4, 8][i]}%</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-white/5 p-4 text-left">
              <div className="mb-3 text-xs font-medium text-slate-400">Recent Invoices</div>
              {['INV-2024-001 · Al Noor Trading · AED 5,500 · Paid', 'INV-2024-002 · Emirates Tech · AED 12,000 · Sent', 'INV-2024-003 · Dubai Retail LLC · AED 3,200 · Draft'].map((line, i) => (
                <div key={i} className="flex items-center justify-between border-t border-white/5 py-2 text-xs">
                  <span className="text-slate-300">{line.split(' · ').slice(0, 2).join(' · ')}</span>
                  <span className={['text-green-400', 'text-blue-400', 'text-slate-400'][i]}>{line.split(' · ')[3]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[#0F1F3D] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold">Everything your UAE business needs</h2>
          <p className="mb-12 text-center text-slate-400">VAT-compliant, AED-native, UAE-first.</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: '🧾', title: 'VAT-Compliant Invoicing', desc: 'Generate FTA-compliant invoices with 5% VAT calculation, TRN display, and Arabic support.' },
              { icon: '📦', title: 'Purchase Orders & Suppliers', desc: 'Manage supplier relationships, POs, and goods receipts in one unified workflow.' },
              { icon: '👥', title: 'HR & Payroll Management', desc: 'UAE WPS-ready payroll, employee records, leave management, and visa tracking.' },
              { icon: '📊', title: 'Accounting & Ledgers', desc: 'Double-entry bookkeeping, chart of accounts, and real-time financial reports.' },
              { icon: '💰', title: 'Budget Tracking', desc: 'Set departmental budgets, track actuals, and get alerts before you overspend.' },
              { icon: '🏢', title: 'Multi-Company Support', desc: 'Manage multiple entities under one account — perfect for holding structures.' },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors">
                <div className="mb-3 text-3xl">{f.icon}</div>
                <h3 className="mb-2 font-semibold text-white">{f.title}</h3>
                <p className="text-sm text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold">Who it's for</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: '💼', title: 'Freelancers & Consultants', desc: 'Send professional invoices, track payments, and manage your finances without an accountant.' },
              { icon: '🏪', title: 'SMEs & Trading Companies', desc: 'Full purchase-to-pay cycle, supplier management, and VAT reporting for growing businesses.' },
              { icon: '🖥️', title: 'Digital Agencies & Service Firms', desc: 'Multi-project billing, retainer management, and team payroll under one roof.' },
            ].map((c) => (
              <div key={c.title} className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-8 text-center">
                <div className="mb-4 text-4xl">{c.icon}</div>
                <h3 className="mb-3 text-lg font-semibold">{c.title}</h3>
                <p className="text-sm text-slate-400">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#0F1F3D] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold">Get started in minutes</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up free — no credit card required.' },
              { step: '02', title: 'Set Up Company', desc: 'Add your TRN, logo, and business details.' },
              { step: '03', title: 'Start Invoicing', desc: 'Create your first VAT invoice and send it instantly.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#2563EB] text-lg font-bold">{s.step}</div>
                <h3 className="mb-2 font-semibold">{s.title}</h3>
                <p className="text-sm text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold">Start free, upgrade when you grow</h2>
          <p className="mb-12 text-slate-400">No hidden fees. No long-term contracts.</p>
          <div className="mx-auto max-w-sm rounded-2xl border border-[#2563EB]/40 bg-[#2563EB]/10 p-8">
            <div className="mb-2 text-sm font-medium text-blue-400">Starter Plan</div>
            <div className="mb-1 text-5xl font-bold">Free</div>
            <div className="mb-6 text-sm text-slate-400">Forever. No credit card.</div>
            <ul className="mb-8 space-y-2 text-left text-sm text-slate-300">
              {['Up to 10 invoices/month', 'VAT calculation', '1 company', 'Basic reports', 'Email support'].map((f) => (
                <li key={f} className="flex items-center gap-2"><span className="text-green-400">✓</span>{f}</li>
              ))}
            </ul>
            <Link href="/register" className="block w-full rounded-xl bg-[#2563EB] py-3 text-center font-semibold text-white hover:bg-blue-600 transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0A1628] px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#2563EB" />
                <text x="6" y="23" fontFamily="sans-serif" fontWeight="bold" fontSize="16" fill="white">Di</text>
              </svg>
              <span className="font-bold">DdotsInvoice</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
              <Link href="/" className="hover:text-white">Home</Link>
              <Link href="#features" className="hover:text-white">Features</Link>
              <Link href="#pricing" className="hover:text-white">Pricing</Link>
              <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white">Terms of Service</Link>
              <a href="mailto:hello@ddinvoice.com" className="hover:text-white">Contact</a>
            </nav>
          </div>
          <div className="border-t border-white/10 pt-6 text-center text-xs text-slate-500">
            © 2026 DdotsInvoice by Ddotsmedia Technologies LLC. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

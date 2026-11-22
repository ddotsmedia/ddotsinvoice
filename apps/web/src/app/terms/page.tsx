import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — DdotsInvoice',
  description: 'Terms of service for DdotsInvoice by Ddotsmedia Technologies LLC.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#2563EB" />
              <text x="6" y="23" fontFamily="sans-serif" fontWeight="bold" fontSize="16" fill="white">Di</text>
            </svg>
            <span className="font-bold">DdotsInvoice</span>
          </Link>
          <Link href="/login" className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-colors">Sign In</Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-bold">Terms of Service</h1>
        <p className="mb-12 text-sm text-slate-400">Last updated: November 2026</p>

        <div className="space-y-10 text-slate-300">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">1. Service Description</h2>
            <p>DdotsInvoice is a cloud-based business finance platform provided by <strong className="text-white">Ddotsmedia Technologies LLC</strong> (UAE). It offers invoicing, purchase order management, HR &amp; payroll, accounting, and related financial tools designed for UAE businesses.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">2. Acceptance of Terms</h2>
            <p>By registering for or using DdotsInvoice, you agree to these Terms of Service. If you do not agree, do not use the service. These terms apply to all users, including free and paid subscribers.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">3. Acceptable Use</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>You may use DdotsInvoice only for lawful business purposes in accordance with UAE law.</li>
              <li>You must not use the platform for any illegal activity, including tax evasion, money laundering, or fraudulent invoicing.</li>
              <li>You must not attempt to reverse-engineer, hack, or disrupt the platform or its infrastructure.</li>
              <li>You must not share your account credentials with unauthorized parties.</li>
              <li>You must ensure all data you enter (TRN, company details, employee records) is accurate and truthful.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">4. Subscription &amp; Billing</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>The Starter plan is free with defined usage limits.</li>
              <li>Paid plans are billed monthly or annually in AED. Prices are listed on our pricing page and may change with 30 days' notice.</li>
              <li>Subscriptions auto-renew unless cancelled before the renewal date.</li>
              <li>Refunds are considered on a case-by-case basis; contact <a href="mailto:billing@ddinvoice.com" className="text-blue-400 hover:underline">billing@ddinvoice.com</a>.</li>
              <li>Failure to pay may result in account suspension after a 7-day grace period.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">5. Data Ownership</h2>
            <p><strong className="text-white">You own your data.</strong> All invoices, contacts, financial records, and documents you create in DdotsInvoice remain your property. We do not claim any rights over your business data. You may export or delete your data at any time. Upon account deletion, your data is permanently removed from our servers within 30 days.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">6. Intellectual Property</h2>
            <p>The DdotsInvoice platform, including its software, design, and branding, is the intellectual property of Ddotsmedia Technologies LLC. You may not copy, redistribute, or create derivative works without written permission.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">7. Service Availability</h2>
            <p>We aim for 99.5% uptime but do not guarantee uninterrupted service. Scheduled maintenance will be communicated in advance. We are not liable for losses resulting from temporary unavailability.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by UAE law, Ddotsmedia Technologies LLC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of DdotsInvoice, including but not limited to loss of revenue, data loss, or business interruption. Our total liability shall not exceed the amount you paid in the preceding 12 months.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">9. Termination</h2>
            <p>Either party may terminate the agreement at any time. We may suspend or terminate your account immediately for violations of these terms, illegal activity, or non-payment. You may cancel your account at any time through your account settings or by contacting support.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">10. Governing Law</h2>
            <p>These Terms of Service are governed by the laws of the <strong className="text-white">United Arab Emirates</strong>. Any disputes shall be subject to the exclusive jurisdiction of UAE courts.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">11. Changes to Terms</h2>
            <p>We may update these terms from time to time. Registered users will be notified by email at least 14 days before material changes take effect. Continued use of the service constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">12. Contact</h2>
            <p>Ddotsmedia Technologies LLC<br />
            United Arab Emirates<br />
            Email: <a href="mailto:legal@ddinvoice.com" className="text-blue-400 hover:underline">legal@ddinvoice.com</a></p>
          </section>
        </div>

        <div className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-slate-500">
          <Link href="/" className="text-blue-400 hover:underline">← Back to Home</Link>
          {' · '}
          <Link href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — DdotsInvoice',
  description: 'Privacy policy for DdotsInvoice by Ddotsmedia Technologies LLC.',
};

export default function PrivacyPage() {
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
        <h1 className="mb-2 text-4xl font-bold">Privacy Policy</h1>
        <p className="mb-12 text-sm text-slate-400">Last updated: November 2026</p>

        <div className="space-y-10 text-slate-300">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">1. Company Information</h2>
            <p>DdotsInvoice is a product of <strong className="text-white">Ddotsmedia Technologies LLC</strong>, a company registered in the United Arab Emirates. By using our service, you agree to this Privacy Policy.</p>
            <p className="mt-2">Contact: <a href="mailto:privacy@ddinvoice.com" className="text-blue-400 hover:underline">privacy@ddinvoice.com</a></p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">2. Data We Collect</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong className="text-white">Account Information:</strong> Name, email address, password (hashed), phone number.</li>
              <li><strong className="text-white">Company Information:</strong> Business name, Trade License number, Tax Registration Number (TRN), address, logo.</li>
              <li><strong className="text-white">Invoice &amp; Financial Data:</strong> Invoices, purchase orders, payments, suppliers, customers, and related transaction records.</li>
              <li><strong className="text-white">HR &amp; Payroll Data:</strong> Employee records, salaries, leave requests, visa details (only when you enter them).</li>
              <li><strong className="text-white">Usage Data:</strong> Log files, IP addresses, browser type, pages visited — for security and product improvement.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">3. How We Use Your Data</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>Providing and improving the DdotsInvoice service.</li>
              <li>Sending transactional emails (account verification, invoice notifications).</li>
              <li>Customer support and troubleshooting.</li>
              <li>Security monitoring and fraud prevention.</li>
              <li>Compliance with UAE law and FTA requirements.</li>
            </ul>
            <p className="mt-3 font-medium text-white">We do not sell, rent, or share your personal data with third parties for marketing purposes.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">4. Data Storage &amp; Security</h2>
            <p>Your data is stored on secure cloud servers located in the UAE and/or EU (GDPR-compliant regions). We use industry-standard encryption (TLS in transit, AES-256 at rest), access controls, and regular security audits to protect your information.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">5. Your Rights</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong className="text-white">Access:</strong> Request a copy of all data we hold about you.</li>
              <li><strong className="text-white">Correction:</strong> Update inaccurate or incomplete information through your account settings.</li>
              <li><strong className="text-white">Deletion:</strong> Request permanent deletion of your account and all associated data.</li>
              <li><strong className="text-white">Export:</strong> Download your invoices, contacts, and financial records at any time.</li>
              <li><strong className="text-white">Objection:</strong> Opt out of non-essential communications.</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, email <a href="mailto:privacy@ddinvoice.com" className="text-blue-400 hover:underline">privacy@ddinvoice.com</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">6. Cookies</h2>
            <p>We use essential cookies for authentication (session tokens) and functional cookies for user preferences (language, theme). No third-party advertising cookies are used.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">7. Third-Party Services</h2>
            <p>We may use trusted third-party providers for email delivery, payment processing, and infrastructure hosting. These providers are contractually bound to protect your data and may not use it for their own purposes.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">8. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify registered users by email at least 14 days before significant changes take effect. Continued use of the service after the effective date constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">9. Contact</h2>
            <p>Ddotsmedia Technologies LLC<br />
            United Arab Emirates<br />
            Email: <a href="mailto:privacy@ddinvoice.com" className="text-blue-400 hover:underline">privacy@ddinvoice.com</a></p>
          </section>
        </div>

        <div className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-slate-500">
          <Link href="/" className="text-blue-400 hover:underline">← Back to Home</Link>
          {' · '}
          <Link href="/terms" className="text-blue-400 hover:underline">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}

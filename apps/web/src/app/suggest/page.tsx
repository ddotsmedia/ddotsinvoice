'use client';

import { useState } from 'react';
import { CheckCircle, ArrowLeft, ArrowRight, Lightbulb, Bug, Zap } from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:3001');

const CATEGORIES = ['Feature Request', 'Bug Report', 'UI/UX Improvement', 'Performance', 'Integration', 'Other'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
type Priority = typeof PRIORITIES[number];

const priorityLabel: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
const priorityColor: Record<Priority, string> = {
  low: 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm',
  medium: 'border-amber-400 bg-amber-50 text-amber-700 shadow-sm',
  high: 'border-red-400 bg-red-50 text-red-700 shadow-sm',
  critical: 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm',
};

export default function SuggestPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [wantsNotification, setWantsNotification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, category, priority, subject, description, wantsNotification }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Submission failed. Please try again.');
      }
      setSubmittedName(name);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName(''); setEmail(''); setCategory(''); setPriority('medium');
    setSubject(''); setDescription(''); setWantsNotification(false);
    setError(''); setSubmitted(false); setSubmittedName('');
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 h-15 border-b border-white/10 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-15 max-w-7xl items-center justify-between px-6" style={{ height: '60px' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-blue-500 shadow-sm">
              <svg className="h-4.5 w-4.5 text-white" style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">DdotsInvoice</span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
        </div>
      </header>

      {/* Split Hero Section */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F1729 0%, #1a2d6b 50%, #3B5BDB 100%)', paddingTop: '60px', paddingBottom: '48px' }}
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #5C7CFA, transparent)' }} />
          <div className="absolute bottom-0 -left-24 h-64 w-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
            {/* LEFT — Copy */}
            <div className="flex-1 pt-4">
              {/* Eyebrow chip */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
                🚀 Shape the Product
              </div>

              <h1 className="mb-5 text-4xl font-extrabold leading-tight tracking-tight text-white lg:text-5xl">
                Your ideas build the<br className="hidden sm:block" /> future of UAE<br className="hidden sm:block" /> business finance
              </h1>

              <p className="mb-10 text-lg font-medium text-blue-200 leading-relaxed">
                Every suggestion goes straight to our product team.<br className="hidden sm:block" /> We read them all.
              </p>

              {/* Stat pills */}
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: <Lightbulb className="h-4 w-4" />, label: 'Feature ideas' },
                  { icon: <Bug className="h-4 w-4" />, label: 'Bug reports' },
                  { icon: <Zap className="h-4 w-4" />, label: 'Performance wins' },
                ].map(({ icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm"
                  >
                    <span className="text-blue-200">{icon}</span>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — Form Card */}
            <div className="w-full lg:w-[480px] lg:flex-shrink-0">
              <div className="rounded-2xl bg-white p-7 shadow-2xl shadow-black/40 ring-1 ring-white/5">
                {submitted ? (
                  <div className="flex flex-col items-center gap-5 py-6 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
                      <CheckCircle className="h-12 w-12 text-emerald-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="mb-2 text-2xl font-bold text-slate-900">Thank you, {submittedName}!</h2>
                      <p className="mx-auto max-w-xs leading-relaxed text-slate-500 text-sm">
                        We&apos;ll review your suggestion and reach out if you opted in for updates.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="mt-1 text-sm font-semibold text-indigo-600 underline underline-offset-2 transition-colors hover:text-indigo-800"
                    >
                      Submit another suggestion
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="mb-1">
                      <h2 className="text-xl font-bold text-slate-900">Submit Your Suggestion</h2>
                      <p className="mt-0.5 text-xs text-slate-400 font-medium tracking-wide uppercase">Takes 2 minutes</p>
                    </div>

                    {error && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    {/* Name + Email */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="">Select a category…</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Priority</label>
                      <div className="flex gap-2">
                        {PRIORITIES.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p)}
                            className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                              priority === p
                                ? priorityColor[p]
                                : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                          >
                            {priorityLabel[p]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={100}
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Brief title for your suggestion"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                      />
                      <div className="mt-1 text-right text-xs text-slate-400">{subject.length}/100</div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        minLength={20}
                        maxLength={1000}
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your suggestion in detail…"
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                      />
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                        <span>{description.length < 20 ? `${20 - description.length} more chars needed` : ''}</span>
                        <span>{description.length}/1000</span>
                      </div>
                    </div>

                    {/* Notification toggle */}
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-700">Notify me when addressed</div>
                        <div className="text-xs text-slate-400">Email when your suggestion is reviewed</div>
                      </div>
                      <button
                        type="button"
                        aria-label="Toggle notification"
                        onClick={() => setWantsNotification(!wantsNotification)}
                        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-1 ${wantsNotification ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${wantsNotification ? 'translate-x-5' : 'translate-x-0.5'}`}
                        />
                      </button>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.99] disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #3B5BDB 0%, #5C7CFA 100%)', minHeight: '48px' }}
                    >
                      {loading ? 'Submitting…' : (
                        <>
                          Submit Suggestion
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <section className="border-b border-slate-100 bg-slate-50 py-6">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="mb-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Trusted by businesses across the UAE · Built on real feedback
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
            {[
              '✓ Reviewed within 48 hours',
              '✓ Vote on others\' ideas (coming soon)',
              '✓ Get notified when shipped',
            ].map((item) => (
              <span key={item} className="font-medium">{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Why your feedback matters */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Why your feedback matters</h2>
            <p className="text-slate-500 text-lg">Every voice shapes what DdotsInvoice becomes.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: '🔍',
                title: 'We review every submission',
                desc: 'Nothing is auto-filtered or discarded. A real human reads every suggestion.',
              },
              {
                icon: '📊',
                title: 'Prioritized by impact',
                desc: 'High-priority bugs and widely-requested features move to the top of our roadmap.',
              },
              {
                icon: '💬',
                title: 'You hear back',
                desc: 'Opt in to notifications and we\'ll email you when your suggestion is addressed.',
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-7 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 text-3xl">{icon}</div>
                <h3 className="mb-2 text-base font-bold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-slate-50 py-8">
        <p className="text-center text-xs text-slate-400">
          © 2024 DdotsInvoice · Built by Ddotsmedia Technologies LLC · +971 50 937 9212
        </p>
      </footer>
    </div>
  );
}

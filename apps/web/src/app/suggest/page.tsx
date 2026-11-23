'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:3001');

const CATEGORIES = ['Feature Request', 'Bug Report', 'UI/UX Improvement', 'Performance', 'Integration', 'Other'];
const PRIORITIES = ['low', 'medium', 'high'] as const;
type Priority = typeof PRIORITIES[number];

const priorityLabel: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero */}
      <div
        className="px-4 py-16 text-center"
        style={{ background: 'linear-gradient(135deg, #3B5BDB 0%, #5C7CFA 100%)' }}
      >
        <div className="mx-auto max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 shadow-lg">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">DdotsInvoice</span>
          </div>
          <h1 className="mb-3 text-3xl font-extrabold text-white leading-tight">
            Help us build the future of<br />UAE business finance
          </h1>
          <p className="text-lg text-blue-100 font-medium mb-1">Your ideas shape what we build next.</p>
          <p className="text-sm text-blue-200">Every suggestion is read by our team.</p>
        </div>
      </div>

      {/* Card */}
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl bg-white shadow-xl shadow-slate-200/60 p-8 md:p-10">
          {submitted ? (
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle className="h-12 w-12 text-emerald-500" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank you, {submittedName}!</h2>
                <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Your suggestion has been submitted. We review every submission and will be in touch if you opted in for updates.
                </p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="mt-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition-colors"
              >
                Submit another suggestion
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Share your idea</h2>
                <p className="text-sm text-slate-500">Fill in the form and our team will review it promptly.</p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                {/* Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select a category…</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Priority</label>
                <div className="flex gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                        priority === p
                          ? p === 'high'
                            ? 'border-red-400 bg-red-50 text-red-700 shadow-sm'
                            : p === 'medium'
                            ? 'border-amber-400 bg-amber-50 text-amber-700 shadow-sm'
                            : 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm'
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
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief title for your suggestion"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
                <div className="mt-1 text-right text-xs text-slate-400">{subject.length}/100</div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  minLength={20}
                  maxLength={1000}
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your suggestion in detail. What problem does it solve? How should it work?"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{description.length < 20 ? `${20 - description.length} more characters needed` : ''}</span>
                  <span>{description.length}/1000</span>
                </div>
              </div>

              {/* Notification toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-700">Notify me when addressed</div>
                  <div className="text-xs text-slate-400">We&apos;ll email you when your suggestion is reviewed</div>
                </div>
                <button
                  type="button"
                  aria-label="Toggle notification"
                  onClick={() => setWantsNotification(!wantsNotification)}
                  className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-1 ${wantsNotification ? 'bg-indigo-600' : 'bg-slate-300'}`}
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
                className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.99] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #3B5BDB 0%, #5C7CFA 100%)' }}
              >
                {loading ? 'Submitting…' : 'Submit Suggestion'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Built and managed by{' '}
          <a href="https://ddotsmedia.com" className="underline hover:text-slate-600" target="_blank" rel="noopener noreferrer">
            Ddotsmedia Technologies LLC
          </a>
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';
import { toast } from 'sonner';

interface OcrResult {
  rawText: string;
  amount: string;
  date: string;
  vendor: string;
}

function extractFromText(text: string): OcrResult {
  // Amount: look for numbers near AED/amount keywords
  const amountMatch = text.match(/(?:AED|aed|Amount|AMOUNT|Total|TOTAL|تومان|درهم)[^\d]*(\d[\d,.]+)/i)
    ?? text.match(/(\d[\d,.]+)\s*(?:AED|aed)/i)
    ?? text.match(/(\d{1,6}[.,]\d{2})/);
  const amount = amountMatch ? amountMatch[1].replace(/,/g, '') : '';

  // Date: common date patterns
  const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i)
    ?? text.match(/(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/);
  const date = dateMatch ? dateMatch[1] : '';

  // Vendor: first non-empty line of text (usually company name)
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const vendor = lines[0] ?? '';

  return { rawText: text, amount, date, vendor };
}

export default function NewExpensePage() {
  const L = useLabel();
  const fileRef = useRef<HTMLInputElement>(null);
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  // Form fields
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');

  const handleFile = async (file: File) => {
    if (!file) return;
    setOcrLoading(true);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const result = extractFromText(data.text);
      setOcr(result);
      if (result.vendor && !vendor) setVendor(result.vendor);
      if (result.amount && !amount) setAmount(result.amount);
      if (result.date && !date) {
        // Try to normalize date to YYYY-MM-DD
        const parts = result.date.split(/[\/\-\.]/);
        if (parts.length === 3) {
          const [a, b, c] = parts;
          const normalized = c.length === 4 ? `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}` : result.date;
          setDate(normalized);
        }
      }
      toast.success('Receipt scanned successfully');
    } catch (err) {
      toast.error('OCR failed — please fill in manually');
      console.error(err);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to POST /purchasing/expenses when backend endpoint exists
    toast.info('Expense saved (backend integration pending)');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-primary">{L('New Expense', 'مصروف جديد')}</h1>

      {/* Receipt Upload */}
      <div className={cardCls}>
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-sm">{L('Upload Receipt (OCR)', 'رفع الإيصال (قراءة ذكية)')}</h2>
          <p className="text-xs text-muted mt-0.5">{L('Upload an image or PDF — we will extract the details automatically.', 'ارفع صورة أو PDF وسنستخرج التفاصيل تلقائياً.')}</p>
        </div>
        <div className="p-4">
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 py-10 cursor-pointer hover:border-brand-400 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void handleFile(f); }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
            />
            {ocrLoading ? (
              <p className="text-sm text-muted animate-pulse">{L('Scanning receipt…', 'جاري قراءة الإيصال…')}</p>
            ) : (
              <>
                <div className="text-3xl">🧾</div>
                <p className="text-sm text-muted">{L('Click or drag image/PDF here', 'انقر أو اسحب الصورة/PDF هنا')}</p>
              </>
            )}
          </div>

          {ocr && (
            <div className="mt-4">
              <button
                type="button"
                className="text-xs text-brand-400 hover:underline"
                onClick={() => setShowRaw((v) => !v)}
              >
                {showRaw ? L('Hide OCR text', 'إخفاء نص OCR') : L('Show OCR text', 'عرض نص OCR')}
              </button>
              {showRaw && (
                <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs text-muted whitespace-pre-wrap">
                  {ocr.rawText}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expense Form */}
      <form onSubmit={handleSubmit} className={cardCls}>
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-sm">{L('Expense Details', 'تفاصيل المصروف')}</h2>
        </div>
        <div className="p-4 space-y-4">
          <Field label={L('Vendor / Supplier', 'المورد')}>
            <input className={inputCls} value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder={L('Vendor name', 'اسم المورد')} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={L('Amount (AED)', 'المبلغ (درهم)')}>
              <input className={inputCls} type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" dir="ltr" required />
            </Field>
            <Field label={L('Date', 'التاريخ')}>
              <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} dir="ltr" required />
            </Field>
          </div>
          <Field label={L('Description', 'الوصف')}>
            <textarea className={`${inputCls} min-h-20`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={L('What was this expense for?', 'ما الغرض من هذا المصروف؟')} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 px-4 pb-4">
          <button type="submit" className={btnCls}>{L('Save Expense', 'حفظ المصروف')}</button>
        </div>
      </form>
    </div>
  );
}

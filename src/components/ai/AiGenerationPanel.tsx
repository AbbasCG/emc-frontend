import { Copy, RefreshCw, Save } from 'lucide-react'
import { useState } from 'react'
import toast from '@/lib/toast'
import type { AiGenerationKind } from '@/types/ai'

const options: { value: AiGenerationKind; label: string }[] = [
  { value: 'course_outline', label: 'توليد مخطط دورة' },
  { value: 'workshop_plan', label: 'توليد ورشة' },
  { value: 'quiz', label: 'توليد اختبار' },
  { value: 'marketing_copy', label: 'توليد نسخة تسويقية' },
  { value: 'report_summary', label: 'توليد ملخص تقرير' },
]

export default function AiGenerationPanel({
  loading,
  output,
  onGenerate,
}: {
  loading?: boolean
  output?: string
  onGenerate: (input: { kind: AiGenerationKind; prompt: string; temperature: number }) => Promise<void>
}) {
  const [kind, setKind] = useState<AiGenerationKind>('course_outline')
  const [prompt, setPrompt] = useState('')
  const [temperature, setTemperature] = useState(0.4)

  async function onCopy() {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      toast.success('تم النسخ')
    } catch {
      toast.error('تعذر النسخ')
    }
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-black text-deepBlue">AI Content Studio</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="text-xs font-black text-slate-400">نوع المحتوى</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as AiGenerationKind)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none ring-customBlue/25 focus:ring-2"
          >
            {options.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-black text-slate-400">الحرارة (المرونة)</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="mt-3 w-full accent-customBlue"
          />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="text-xs font-black text-slate-400">Prompt</span>
        <textarea
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium outline-none ring-customBlue/25 focus:ring-2"
          placeholder="اكتب طلبك هنا..."
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onGenerate({ kind, prompt, temperature })}
          disabled={loading}
          className="rounded-xl bg-customBlue px-4 py-2 text-xs font-black text-white shadow-md disabled:opacity-60"
        >
          {loading ? 'جارٍ التوليد...' : 'توليد'}
        </button>
        <button type="button" onClick={onCopy} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-deepBlue">
          <Copy size={14} />
          نسخ
        </button>
        <button type="button" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-deepBlue">
          <Save size={14} />
          حفظ
        </button>
        <button type="button" onClick={() => void onGenerate({ kind, prompt, temperature })} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-deepBlue">
          <RefreshCw size={14} />
          إعادة توليد
        </button>
      </div>
      <div className="mt-4 rounded-xl bg-[#F6F8FB] p-4 ring-1 ring-slate-100">
        <p className="text-xs font-black text-slate-400">المعاينة</p>
        <pre className="mt-2 whitespace-pre-wrap text-xs leading-6 text-deepBlue">{output ?? 'لا يوجد ناتج بعد.'}</pre>
      </div>
    </section>
  )
}

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, StickyNote } from 'lucide-react'
import { formatDateTime } from '@/utils/dateTime'

type Props = {
  notes: string
  onChangeNotes: (v: string) => void
  onSave: () => void | Promise<void>
  loading: boolean
  saving: boolean
  savedAt: string | null
  error: string | null
}

const AUTOSAVE_DELAY = 1200

export default function NotesTab({ notes, onChangeNotes, onSave, loading, saving, savedAt, error }: Props) {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const timerRef = useRef<number | null>(null)
  const dirtyRef = useRef(false)

  useEffect(() => {
    if (saving) setSaveState('saving')
    else if (error) setSaveState('error')
    else if (dirtyRef.current === false && savedAt) setSaveState('saved')
  }, [saving, error, savedAt])

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current) }, [])

  function handleChange(v: string) {
    onChangeNotes(v)
    dirtyRef.current = true
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      dirtyRef.current = false
      void onSave()
    }, AUTOSAVE_DELAY)
  }

  const isEmpty = notes.trim() === ''

  return (
    <div className="rounded-3xl border border-[#22334A]/[0.08] bg-white/85 p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-black text-[#22334A]">
          <StickyNote className="h-5 w-5 text-[#EC943C]" />
          ملاحظاتي الخاصة
        </h2>
        <div className="flex items-center gap-3">
          {saveState === 'saving' && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#22334A]/50">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              جارٍ الحفظ…
            </span>
          )}
          {saveState === 'saved' && savedAt && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              محفوظة · {formatDateTime(savedAt)}
            </span>
          )}
          {saveState === 'error' && (
            <span className="text-[11px] font-bold text-rose-600">{error}</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-[13px] font-semibold text-[#22334A]/50">
          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          جارٍ تحميل الملاحظات…
        </div>
      ) : (
        <>
          <textarea
            value={notes}
            onChange={(e) => handleChange(e.target.value)}
            dir="rtl"
            rows={12}
            placeholder="دوّن أفكارك، روابط مهمة أو ما تريد متابعته قبل الجلسة القادمة..."
            className="w-full resize-y rounded-2xl border border-[#22334A]/12 bg-slate-50/60 px-4 py-3.5 text-[13px] font-semibold leading-relaxed text-[#22334A] shadow-inner outline-none ring-1 ring-transparent transition focus:border-[#2691C2]/35 focus:ring-[#2691C2]/20"
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-[#22334A]/40">
              {isEmpty ? 'لم تقم بإضافة أي ملاحظات بعد' : 'ملاحظاتك خاصة ولا تظهر للمدرب أو الإدارة'}
            </p>
            <p className="text-[10px] font-bold tabular-nums text-[#22334A]/35">{notes.length} حرف</p>
          </div>
        </>
      )}
    </div>
  )
}

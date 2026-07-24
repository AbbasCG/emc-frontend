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
  // Lazy initialiser so a remount with the save already settled shows the same badge the
  // old mount-time effect produced.
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    () => (saving ? 'saving' : error ? 'error' : savedAt ? 'saved' : 'idle'),
  )
  const timerRef = useRef<number | null>(null)
  // State rather than a ref: the badge is derived during render below, and reading
  // `ref.current` while rendering is forbidden (`react-hooks/refs`).
  const [dirty, setDirty] = useState(false)

  // Derive the badge during render when the save signals change (react.dev "adjusting
  // state when a prop changes").
  const [seenSave, setSeenSave] = useState({ saving, error, savedAt })
  if (seenSave.saving !== saving || seenSave.error !== error || seenSave.savedAt !== savedAt) {
    setSeenSave({ saving, error, savedAt })
    if (saving) setSaveState('saving')
    else if (error) setSaveState('error')
    else if (!dirty && savedAt) setSaveState('saved')
  }

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current) }, [])

  function handleChange(v: string) {
    onChangeNotes(v)
    setDirty(true)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      setDirty(false)
      void onSave()
    }, AUTOSAVE_DELAY)
  }

  const isEmpty = notes.trim() === ''

  return (
    <div className="rounded-3xl border border-[#0C2A4B]/[0.08] bg-white/85 p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-black text-[#0C2A4B]">
          <StickyNote className="h-5 w-5 text-[#F28C00]" />
          ملاحظاتي الخاصة
        </h2>
        <div className="flex items-center gap-3">
          {saveState === 'saving' && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0C2A4B]/50">
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
        <div className="flex items-center justify-center py-10 text-[13px] font-semibold text-[#0C2A4B]/50">
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
            className="w-full resize-y rounded-2xl border border-[#0C2A4B]/12 bg-slate-50/60 px-4 py-3.5 text-[13px] font-semibold leading-relaxed text-[#0C2A4B] shadow-inner outline-none ring-1 ring-transparent transition focus:border-[#0077B6]/35 focus:ring-[#0077B6]/20"
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-[#0C2A4B]/40">
              {isEmpty ? 'لم تقم بإضافة أي ملاحظات بعد' : 'ملاحظاتك خاصة ولا تظهر للمدرب أو الإدارة'}
            </p>
            <p className="text-[10px] font-bold tabular-nums text-[#0C2A4B]/35">{notes.length} حرف</p>
          </div>
        </>
      )}
    </div>
  )
}

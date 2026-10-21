import { useEffect, useState } from 'react'
import FormRenderer from '@/components/operations/FormRenderer'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { parseFormActionError, previewForm } from '@/api/formsAdminApi'
import type { OpsFormDefinition } from '@/types/operations'

/** The draft exactly as respondents will see it once published. Read-only: it cannot send answers. */
export default function FormPreviewModal({ formId, open, onClose }: { formId: number; open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<OpsFormDefinition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      try {
        const next = await previewForm(formId)
        if (!cancelled) {
          setForm(next)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setForm(null)
          setError(parseFormActionError(e))
        }
      }
    })()

    return () => { cancelled = true }
  }, [formId, open, attempt])

  return (
    <CenteredModal open={open} onClose={onClose} title="معاينة المسودة" subtitle="كما سيراها المجيبون بعد النشر" size="md" testId="preview-modal">
      {error ? (
        <div className="p-6 text-center">
          <p role="alert" className="font-black text-rose-800">{error}</p>
          <button type="button" onClick={() => { setError(null); setAttempt((n) => n + 1) }} className="mt-4 rounded-xl bg-deepBlue px-5 py-2 text-xs font-black text-white">
            إعادة المحاولة
          </button>
        </div>
      ) : !form ? (
        <p className="p-10 text-center text-sm font-bold text-slate-500" aria-busy="true">جارٍ تحميل المعاينة...</p>
      ) : (
        <div dir="rtl" className="mx-auto max-w-xl p-2">
          <FormRenderer form={form} preview onSubmitAnswers={async () => undefined} />
        </div>
      )}
    </CenteredModal>
  )
}

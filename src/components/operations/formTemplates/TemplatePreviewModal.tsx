import { useEffect, useState } from 'react'
import FormRenderer from '@/components/operations/FormRenderer'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { fetchTemplate, parseTemplateError, templateAsForm } from '@/api/formsTemplatesApi'
import type { FormTemplateDetail } from '@/api/formsTemplatesApi'

/** A template as its form will look, with its steps and conditions working. Nothing can be sent from it. */
export default function TemplatePreviewModal({
  templateId,
  onClose,
  onUse,
}: {
  templateId: string | null
  onClose: () => void
  onUse?: (detail: FormTemplateDetail) => void
}) {
  const [detail, setDetail] = useState<FormTemplateDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!templateId) return
    let cancelled = false
    void (async () => {
      try {
        const next = await fetchTemplate(templateId)
        if (!cancelled) {
          setDetail(next)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setDetail(null)
          setError(parseTemplateError(e).message)
        }
      }
    })()

    return () => { cancelled = true }
  }, [templateId, attempt])

  const shown = detail && detail.id === templateId ? detail : null

  return (
    <CenteredModal
      open={templateId !== null}
      onClose={onClose}
      title={shown?.name ?? 'معاينة القالب'}
      subtitle="معاينة فقط: لا تُرسل أي إجابات"
      size="md"
      testId="template-preview"
      footer={shown && onUse ? (
        <div className="flex justify-end">
          <button type="button" onClick={() => onUse(shown)} className="rounded-xl bg-customBlue px-5 py-2.5 text-xs font-black text-white shadow-md">
            استخدام هذا القالب
          </button>
        </div>
      ) : undefined}
    >
      {error ? (
        <div className="p-6 text-center">
          <p role="alert" className="font-black text-rose-800">{error}</p>
          <button type="button" onClick={() => { setError(null); setAttempt((n) => n + 1) }} className="mt-4 rounded-xl bg-deepBlue px-5 py-2 text-xs font-black text-white">
            إعادة المحاولة
          </button>
        </div>
      ) : !shown ? (
        <p className="p-10 text-center text-sm font-bold text-slate-500" aria-busy="true">جارٍ تحميل المعاينة...</p>
      ) : (
        <div dir="rtl" className="mx-auto max-w-xl space-y-3 p-2">
          {shown.domain_notice && (
            <p role="note" className="rounded-xl bg-amber-50 px-4 py-3 text-right text-xs font-bold leading-6 text-amber-900 ring-1 ring-amber-200">{shown.domain_notice}</p>
          )}
          <FormRenderer form={templateAsForm(shown)} preview onSubmitAnswers={async () => undefined} />
        </div>
      )}
    </CenteredModal>
  )
}

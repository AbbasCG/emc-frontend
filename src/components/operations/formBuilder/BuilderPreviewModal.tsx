import { useMemo, useState } from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import FormRenderer from '@/components/operations/FormRenderer'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { toQuestions } from './builderDoc'
import type { BuilderDoc } from './builderDoc'
import type { OpsFormDefinition } from '@/types/operations'

type Device = 'desktop' | 'mobile'

/**
 * The document as it is right now, drawn by the real public renderer — including edits that are not saved yet. It validates
 * and pages exactly like the public form but sends nothing, and it says so on its face so it cannot be mistaken for the form.
 */
export default function BuilderPreviewModal({ open, onClose, doc, formId, slug }: { open: boolean; onClose: () => void; doc: BuilderDoc; formId: number; slug: string }) {
  const [device, setDevice] = useState<Device>('desktop')
  const [run, setRun] = useState(0)

  const previewForm = useMemo<OpsFormDefinition>(
    () => ({
      id: formId,
      slug,
      title: doc.title.trim() || 'نموذج بلا عنوان',
      description: doc.description,
      form_type: doc.formType,
      questions: toQuestions(doc.blocks),
      created_at: '',
    }),
    [doc, formId, slug],
  )

  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      title="معاينة مباشرة"
      subtitle="كما سيراها المجيبون — بما في ذلك تعديلاتك غير المحفوظة. لا يُرسل شيء من هنا."
      size="lg"
      testId="builder-preview-modal"
    >
      <div dir="rtl" className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setRun((n) => n + 1)} className="rounded-xl bg-white px-3 py-1.5 text-[11px] font-black text-deepBlue ring-1 ring-deepBlue/10 hover:bg-slate-50">
            إعادة ضبط المعاينة
          </button>
          <div role="group" aria-label="حجم الشاشة" className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
            {([['desktop', 'سطح المكتب', Monitor], ['mobile', 'الجوال', Smartphone]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                aria-pressed={device === key}
                onClick={() => setDevice(key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black ${device === key ? 'bg-white text-deepBlue shadow-sm' : 'text-slate-500'}`}
              >
                <Icon size={14} aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 sm:p-5">
          <div data-testid="preview-frame" data-device={device} className={`mx-auto transition-[max-width] ${device === 'mobile' ? 'max-w-[375px]' : 'max-w-2xl'}`}>
            <FormRenderer key={`${run}-${previewForm.questions.length}`} form={previewForm} preview onSubmitAnswers={async () => undefined} />
          </div>
        </div>
      </div>
    </CenteredModal>
  )
}

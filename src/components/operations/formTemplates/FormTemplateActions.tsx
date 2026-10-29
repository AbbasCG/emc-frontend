import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Copy, LayoutTemplate } from 'lucide-react'
import { NewFormDialog, TemplateDetailsDialog } from './TemplateDialogs'
import { duplicateForm, fetchTemplateLibrary, parseTemplateError, saveFormAsTemplate } from '@/api/formsTemplatesApi'
import type { TemplateLibrary } from '@/api/formsTemplatesApi'
import type { OpsFormDefinition } from '@/types/operations'

const BUTTON = 'inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black text-deepBlue ring-1 ring-deepBlue/10 transition hover:bg-slate-50 disabled:opacity-50'

type Open = 'duplicate' | 'template' | null

/**
 * "Duplicate" and "Save as template" on a form's page. Both copy the CURRENT DRAFT's structure only (questions, sections, rules):
 * never responses, sharing, collaborators or versions. The departments offered are the ones the server would accept.
 */
export default function FormTemplateActions({ form, hasUnsavedEdits = false }: { form: OpsFormDefinition; hasUnsavedEdits?: boolean }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState<Open>(null)
  const [context, setContext] = useState<TemplateLibrary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function start(which: Exclude<Open, null>) {
    setError(null)
    setNotice(null)
    if (context) {
      setOpen(which)
      return
    }
    setLoading(true)
    try {
      // The departments and abilities come with the library listing; "mine" keeps that request small.
      const next = await fetchTemplateLibrary({ source: 'mine' })
      setContext(next)
      if (next.canCreate) setOpen(which)
      else setError('لا تملك صلاحية إنشاء النماذج.')
    } catch (e) {
      setError(parseTemplateError(e).message)
    } finally {
      setLoading(false)
    }
  }

  const canCreate = context?.canCreate ?? true
  const defaultDepartment = form.department_id != null && context?.departments.some((d) => d.id === form.department_id) ? form.department_id : null

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={BUTTON} disabled={loading || !canCreate} onClick={() => void start('duplicate')}>
          <Copy size={14} aria-hidden /> نسخ النموذج
        </button>
        <button type="button" className={BUTTON} disabled={loading || !canCreate} onClick={() => void start('template')}>
          <LayoutTemplate size={14} aria-hidden /> حفظ كقالب
        </button>
      </div>
      {hasUnsavedEdits && open === null && (
        <p className="text-[11px] font-semibold text-slate-500">النسخ والقوالب تأخذ آخر نسخة محفوظة من المسودة.</p>
      )}
      {error && <p role="alert" className="text-xs font-bold text-red-700">{error}</p>}
      {notice && <p role="status" className="text-xs font-bold text-emerald-700">{notice}</p>}

      {open === 'duplicate' && context && (
        <NewFormDialog
          open
          onClose={() => setOpen(null)}
          heading="نسخ النموذج"
          intro="تُنسخ الأسئلة والأقسام والشروط إلى مسودة جديدة خاصة بك. لا تُنسخ الإجابات ولا روابط المشاركة ولا المتعاونون ولا الإصدارات."
          submitLabel="إنشاء النسخة وفتحها"
          defaultTitle={`نسخة من ${form.title}`}
          defaultDepartmentId={defaultDepartment}
          departments={context.departments}
          onSubmit={async (body) => {
            const copy = await duplicateForm(form.id, body)
            setOpen(null)
            navigate(`/dashboard/admin/forms/${copy.id}`)
          }}
        />
      )}

      {open === 'template' && context && (
        <TemplateDetailsDialog
          open
          onClose={() => setOpen(null)}
          heading="حفظ النموذج كقالب"
          submitLabel="حفظ القالب"
          initial={{ name: form.title, description: form.description ?? null, category: 'general', visibility: 'private', department_id: defaultDepartment }}
          departments={context.departments}
          canShareOrganization={context.canShareOrganization}
          onSubmit={async (input) => {
            await saveFormAsTemplate(form.id, input)
            setOpen(null)
            setNotice('حُفظ القالب. تجده في مكتبة القوالب.')
          }}
        />
      )}
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import FormBuilder from '@/components/operations/FormBuilder'
import { createFormDefinition } from '@/api/formsApi'

export default function OpsFormCreatePage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="text-right">
        <h1 className="text-xl font-black text-deepBlue">إنشاء نموذج</h1>
        <p className="mt-2 text-xs font-semibold text-slate-500">عرّف الحقول والنوع ثم احفظ للنشر عبر الرابط العام.</p>
      </header>
      <FormBuilder
        onSave={async (draft) => {
          try {
            const created = await createFormDefinition(draft as Parameters<typeof createFormDefinition>[0])
            navigate(`/dashboard/admin/forms/${created.id}`)
          } catch {
            navigate('/dashboard/admin/forms')
          }
        }}
      />
    </div>
  )
}

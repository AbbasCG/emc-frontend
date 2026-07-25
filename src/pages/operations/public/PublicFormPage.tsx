import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import FormRenderer from '@/components/operations/FormRenderer'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import { fetchPublicFormBySlug, submitPublicForm } from '@/api/formsApi'
import type { OpsFormDefinition } from '@/types/operations'

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>()
  const [form, setForm] = useState<OpsFormDefinition | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Re-arm the loading state during render when the slug changes (react.dev
  // "adjusting state when a prop changes"), so the fetch effect below never has to
  // touch state synchronously.
  const [seenSlug, setSeenSlug] = useState(slug)
  if (seenSlug !== slug) {
    setSeenSlug(slug)
    setLoading(true)
    setLoadError(null)
  }

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    ;(async () => {
      try {
        const f = await fetchPublicFormBySlug(slug)
        if (!cancelled) setForm(f)
      } catch {
        if (!cancelled) setLoadError('تعذّر تحميل النموذج. تحقق من الرابط أو الاتصال.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (!slug) return <p className="py-20 text-center font-black text-deepBlue">رابط غير صالح</p>
  if (loading) {
    return (
      <div dir="rtl" className="mx-auto max-w-xl px-4 py-16">
        <OpsPageSkeleton />
      </div>
    )
  }
  if (loadError) return (
    <div dir="rtl" className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
    </div>
  )
  if (!form) return null

  return (
    <div dir="rtl" className="mx-auto max-w-xl px-4 py-16">
      <FormRenderer form={form} onSubmitAnswers={(answers) => submitPublicForm(slug, answers)} />
    </div>
  )
}

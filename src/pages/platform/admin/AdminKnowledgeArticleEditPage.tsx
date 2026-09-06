import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { fetchKnowledgeArticleById, updateKnowledgeArticle } from '@/api/knowledgeApi'
import ArticleEditor from '@/components/platform/ArticleEditor'
import EmptyState from '@/components/dashboard/EmptyState'
import type { KnowledgeArticle } from '@/types/platform'

export default function AdminKnowledgeArticleEditPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [value, setValue] = useState<Partial<KnowledgeArticle> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const a = await fetchKnowledgeArticleById(Number(id))
        if (!cancelled) setValue(a)
      } catch {
        if (!cancelled) setValue(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
  }

  if (!value) {
    return <EmptyState title="المقال غير موجود" />
  }

  async function save() {
    if (!value || !id) return
    setSaving(true)
    await updateKnowledgeArticle(Number(id), value)
    setSaving(false)
    nav('/dashboard/admin/knowledge')
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-deepBlue">تحرير المقال</h1>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-xl bg-customBlue px-5 py-2.5 text-xs font-black text-white shadow-lg disabled:opacity-50"
        >
          تحديث
        </button>
      </div>
      <ArticleEditor value={value} onChange={setValue} />
    </div>
  )
}

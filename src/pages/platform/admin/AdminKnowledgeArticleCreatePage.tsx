import { useState } from 'react'
import { useNavigate } from 'react-router'
import { createKnowledgeArticle } from '@/api/knowledgeApi'
import ArticleEditor from '@/components/platform/ArticleEditor'
import type { KnowledgeArticle } from '@/types/platform'

export default function AdminKnowledgeArticleCreatePage() {
  const nav = useNavigate()
  const [value, setValue] = useState<Partial<KnowledgeArticle>>({
    title: '',
    slug: '',
    excerpt: '',
    body: '<p></p>',
    category_id: 'guides',
    visibility: 'internal',
    status: 'draft',
    tags: [],
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await createKnowledgeArticle(value)
    setSaving(false)
    nav('/dashboard/admin/knowledge')
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-deepBlue">مقال جديد</h1>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-xl bg-deepBlue px-5 py-2.5 text-xs font-black text-white shadow-lg disabled:opacity-50"
        >
          حفظ
        </button>
      </div>
      <ArticleEditor value={value} onChange={setValue} />
      <p className="mt-4 text-xs font-bold leading-6 text-slate-400">
        هذه الواجهة أساس للمحرر الغني لاحقاً — الحفظ الحالي يعمل مع الـ API أو نموذج محلي عند غياب الخادم.
      </p>
    </div>
  )
}

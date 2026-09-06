import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { useEffect, useState } from 'react'
import { fetchKnowledgeArticles } from '@/api/knowledgeApi'
import VisibilityBadge from '@/components/platform/VisibilityBadge'
import EmptyState from '@/components/dashboard/EmptyState'
import type { KnowledgeArticle } from '@/types/platform'

export default function AdminKnowledgeHubPage() {
  const [items, setItems] = useState<KnowledgeArticle[]>([])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const a = await fetchKnowledgeArticles()
      if (!cancelled) setItems(a)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">Admin</p>
          <h1 className="text-2xl font-black text-deepBlue">إدارة قاعدة المعرفة</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/dashboard/admin/knowledge/categories"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-deepBlue shadow-sm"
          >
            الفئات
          </Link>
          <Link
            to="/dashboard/admin/knowledge/articles/create"
            className="rounded-xl bg-customBlue px-4 py-2 text-xs font-black text-white shadow-md"
          >
            مقال جديد
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title="لا مقالات" action={{ label: 'إنشاء مقال', href: '/dashboard/admin/knowledge/articles/create' }} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#F6F8FB] text-[11px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-5 py-3">المقال</th>
                <th className="px-5 py-3">الظهور</th>
                <th className="px-5 py-3">الحالة</th>
                <th className="px-5 py-3">تحديث</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((a, idx) => (
                <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}>
                  <td className="px-5 py-4 font-black text-deepBlue">{a.title}</td>
                  <td className="px-5 py-4">
                    <VisibilityBadge variant="knowledge_visibility" value={a.visibility} />
                  </td>
                  <td className="px-5 py-4">
                    <VisibilityBadge variant="knowledge_status" value={a.status} />
                  </td>
                  <td className="px-5 py-4 text-xs font-bold text-slate-400">{a.updated_at}</td>
                  <td className="px-5 py-4">
                    <Link className="text-xs font-black text-customBlue hover:underline" to={`/dashboard/admin/knowledge/articles/${a.id}/edit`}>
                      تحرير
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

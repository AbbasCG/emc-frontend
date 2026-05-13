import { motion } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchKnowledgeArticleBySlug, fetchKnowledgeArticles } from '@/api/knowledgeApi'
import EmptyState from '@/components/dashboard/EmptyState'
import VisibilityBadge from '@/components/platform/VisibilityBadge'
import type { KnowledgeArticle } from '@/types/platform'

export default function KnowledgeArticlePublicPage() {
  const { slug } = useParams()
  const [article, setArticle] = useState<KnowledgeArticle | null>(null)
  const [related, setRelated] = useState<KnowledgeArticle[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    ;(async () => {
      try {
        const a = await fetchKnowledgeArticleBySlug(slug)
        if (cancelled) return
        setArticle(a)
        const rel = (await fetchKnowledgeArticles({ category: a.category_id }))
          .filter((x) => x.slug !== slug)
          .slice(0, 3)
        setRelated(rel)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطأ')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title={error} description="تحقق من الرابط أو عد إلى الفهرس." action={{ label: 'قاعدة المعرفة', href: '/knowledge' }} />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/knowledge" className="text-xs font-black text-customBlue hover:underline">
          ← العودة إلى قاعدة المعرفة
        </Link>
        <div className="mt-6 flex flex-wrap gap-2">
          <VisibilityBadge variant="knowledge_visibility" value={article.visibility} />
          <VisibilityBadge variant="knowledge_status" value={article.status} />
        </div>
        <h1 className="mt-4 text-3xl font-black leading-[1.35] text-deepBlue md:text-4xl">{article.title}</h1>
        <p className="mt-3 text-sm font-bold text-slate-400">آخر تحديث {article.updated_at}</p>
        {article.excerpt && <p className="mt-6 text-base font-medium leading-8 text-slate-600">{article.excerpt}</p>}
        <div
          className="prose prose-lg prose-slate mt-8 max-w-none text-slate-700 prose-headings:font-black prose-p:leading-8"
          dangerouslySetInnerHTML={{ __html: article.body ?? '' }}
        />
      </motion.div>

      <section className="mt-14 rounded-2xl border border-dashed border-customBlue/25 bg-gradient-to-bl from-sky-50 to-white p-6">
        <h2 className="text-sm font-black text-deepBlue">مقالات ذات صلة (placeholder)</h2>
        <ul className="mt-4 space-y-3">
          {related.map((r) => (
            <li key={r.id}>
              <Link className="text-sm font-black text-customBlue hover:underline" to={`/knowledge/${r.slug}`}>
                {r.title}
              </Link>
            </li>
          ))}
          {related.length === 0 && <li className="text-sm text-slate-400">لا توجد مقترحات بعد.</li>}
        </ul>
      </section>
    </article>
  )
}

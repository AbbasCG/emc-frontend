import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { fetchKnowledgeArticles, fetchKnowledgeCategories } from '@/api/knowledgeApi'
import ArticleCard from '@/components/platform/ArticleCard'
import KnowledgeSidebar from '@/components/platform/KnowledgeSidebar'
import EmptyState from '@/components/dashboard/EmptyState'
import { KNOWLEDGE_CATEGORY_LABELS } from '@/utils/statusLabels'
import type { KnowledgeArticle, KnowledgeCategory } from '@/types/platform'

export default function KnowledgeHubPage() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string | null>(null)
  const [categories, setCategories] = useState<KnowledgeCategory[]>([])
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [c, a] = await Promise.all([
          fetchKnowledgeCategories(),
          fetchKnowledgeArticles({ category: cat ?? undefined, q: q.trim() || undefined }),
        ])
        if (!cancelled) {
          setCategories(c)
          setArticles(a)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cat, q])

  const catTitle = useMemo(() => {
    const map = Object.fromEntries(categories.map((c) => [c.id, c.title]))
    return (id: string) => map[id] ?? KNOWLEDGE_CATEGORY_LABELS[id] ?? id
  }, [categories])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-customBlue">Knowledge OS</p>
        <h1 className="mt-3 text-4xl font-black text-deepBlue md:text-5xl">قاعدة المعرفة</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-8 text-slate-500">
          سياسات، أدلة، قوالب، تقارير، ودروس مستفادة — مساحة عمل تشبه Notion بروح EMC العربية.
        </p>
      </motion.div>

      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <input
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-deepBlue outline-none ring-customBlue/25 focus:ring-2"
          placeholder="ابحث في المقالات..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="text-xs font-black text-slate-400">نتائج فورية عبر الواجهة والـ API</div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <KnowledgeSidebar categories={categories} active={cat} onSelect={setCat} />
        <div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <EmptyState title="لا توجد مقالات" description="جرّب تصفية مختلفة أو عد لاحقاً." />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {articles.map((a) => (
                <ArticleCard key={a.id} article={a} categoryTitle={catTitle(a.category_id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

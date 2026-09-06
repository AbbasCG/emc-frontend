import { useEffect, useMemo, useState } from 'react'
import { fetchKnowledgeArticles, fetchKnowledgeCategories } from '@/api/knowledgeApi'
import PageHeader from '@/components/PageHeader'
import PublicSeo from '@/components/public/PublicSeo'
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

  const hasFilters = q.trim() !== '' || cat !== null

  return (
    <main dir="rtl" className="bg-slate-50 pt-[4.75rem] lg:pt-[5rem]">
      <PublicSeo
        title="قاعدة المعرفة"
        description="قاعدة معرفة EMC: سياسات وأدلة وقوالب وتقارير ودروس مستفادة، مع بحث فوري في المقالات وتصفية حسب الفئة ضمن مساحة عمل عربية منظمة."
        path="/knowledge"
      />
      <PageHeader
        title="قاعدة المعرفة"
        subtitle="سياسات، أدلة، قوالب، تقارير، ودروس مستفادة مساحة عمل تشبه Notion بروح EMC العربية."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'قاعدة المعرفة' },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
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
            <EmptyState
              title="لا توجد مقالات"
 description={hasFilters ? 'جرّب تصفية مختلفة أو أعد ضبط التصفية الحالية.': 'لم تُنشر مقالات بعد عد لاحقاً أو تواصل مع فريق الدعم.'}
              action={
                hasFilters
                  ? { label: 'إعادة ضبط التصفية', onClick: () => { setQ(''); setCat(null) } }
                  : { label: 'تواصل مع الدعم', href: '/support' }
              }
            />
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
    </main>
  )
}

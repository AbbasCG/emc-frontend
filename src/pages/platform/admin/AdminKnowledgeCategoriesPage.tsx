import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { fetchKnowledgeCategories } from '@/api/knowledgeApi'
import type { KnowledgeCategory } from '@/types/platform'

export default function AdminKnowledgeCategoriesPage() {
  const [cats, setCats] = useState<KnowledgeCategory[]>([])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const c = await fetchKnowledgeCategories()
      if (!cancelled) setCats(c)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">Taxonomy</p>
        <h1 className="text-2xl font-black text-deepBlue">فئات المعرفة</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
          >
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{c.slug}</p>
            <h2 className="mt-2 text-lg font-black text-deepBlue">{c.title}</h2>
            {c.description && <p className="mt-2 text-sm leading-7 text-slate-500">{c.description}</p>}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

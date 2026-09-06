import { motion } from 'framer-motion'
import { ArrowLeft, Tag } from 'lucide-react'
import { Link } from 'react-router'
import type { KnowledgeArticle } from '@/types/platform'
import VisibilityBadge from './VisibilityBadge'

type Props = {
  article: KnowledgeArticle
  categoryTitle?: string
}

export default function ArticleCard({ article, categoryTitle }: Props) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:border-customBlue/25 hover:shadow-lg hover:shadow-sky-100/60"
    >
      <Link to={`/knowledge/${article.slug}`} className="block p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <VisibilityBadge variant="knowledge_visibility" value={article.visibility} />
          <VisibilityBadge variant="knowledge_status" value={article.status} />
          {categoryTitle && (
            <span className="rounded-lg bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-100">
              {categoryTitle}
            </span>
          )}
        </div>
        <h3 className="text-lg font-black text-deepBlue transition group-hover:text-customBlue">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-500">{article.excerpt}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {(article.tags ?? []).slice(0, 4).map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-lg bg-[#F6F8FB] px-2 py-0.5 text-[11px] font-bold text-slate-500"
            >
              <Tag size={11} />
              {t}
            </span>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-customBlue">
          <span>عرض المقال</span>
          <ArrowLeft size={16} className="transition group-hover:-translate-x-0.5" />
        </div>
      </Link>
    </motion.article>
  )
}

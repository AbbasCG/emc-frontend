import type { KnowledgeArticle } from '@/types/platform'

type Props = {
  value: Partial<KnowledgeArticle>
  onChange: (next: Partial<KnowledgeArticle>) => void
}

export default function ArticleEditor({ value, onChange }: Props) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-black text-slate-400">العنوان</span>
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-deepBlue outline-none ring-customBlue/30 focus:ring-2"
            value={value.title ?? ''}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-black text-slate-400">المعرّف slug</span>
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-deepBlue outline-none ring-customBlue/30 focus:ring-2"
            dir="ltr"
            value={value.slug ?? ''}
            onChange={(e) => onChange({ ...value, slug: e.target.value })}
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-black text-slate-400">ملخص</span>
        <textarea
          rows={3}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-deepBlue outline-none ring-customBlue/30 focus:ring-2"
          value={value.excerpt ?? ''}
          onChange={(e) => onChange({ ...value, excerpt: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-black text-slate-400">المحتوى (HTML)</span>
        <textarea
          rows={10}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-xs leading-6 text-deepBlue outline-none ring-customBlue/30 focus:ring-2"
          dir="ltr"
          value={value.body ?? ''}
          onChange={(e) => onChange({ ...value, body: e.target.value })}
        />
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block md:col-span-1">
          <span className="mb-1 block text-xs font-black text-slate-400">معرّف الفئة</span>
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none ring-customBlue/30 focus:ring-2"
            value={value.category_id ?? ''}
            onChange={(e) => onChange({ ...value, category_id: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-black text-slate-400">الظهور</span>
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none ring-customBlue/30 focus:ring-2"
            value={value.visibility ?? 'public'}
            onChange={(e) =>
              onChange({ ...value, visibility: e.target.value as KnowledgeArticle['visibility'] })
            }
          >
            <option value="public">عام</option>
            <option value="internal">داخلي</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-black text-slate-400">الحالة</span>
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none ring-customBlue/30 focus:ring-2"
            value={value.status ?? 'draft'}
            onChange={(e) => onChange({ ...value, status: e.target.value as KnowledgeArticle['status'] })}
          >
            <option value="draft">مسودة</option>
            <option value="published">منشور</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-black text-slate-400">وسوم (مفصولة بفاصلة)</span>
        <input
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none ring-customBlue/30 focus:ring-2"
          value={(value.tags ?? []).join(', ')}
          onChange={(e) =>
            onChange({
              ...value,
              tags: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
    </div>
  )
}

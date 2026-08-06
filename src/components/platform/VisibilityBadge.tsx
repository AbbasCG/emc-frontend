import type { DocumentVisibility, KnowledgeStatus, KnowledgeVisibility } from '@/types/platform'

type Props =
  | { variant: 'knowledge_visibility'; value: KnowledgeVisibility }
  | { variant: 'knowledge_status'; value: KnowledgeStatus }
  | { variant: 'document_visibility'; value: DocumentVisibility }

const styles: Record<string, string> = {
  public: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  internal: 'bg-sky-50 text-sky-900 ring-sky-100',
  published: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  draft: 'bg-amber-50 text-amber-900 ring-amber-100',
  management: 'bg-violet-50 text-violet-900 ring-violet-100',
  partner: 'bg-orange-50 text-deepBlue ring-orange-100',
}

const labels: Record<string, string> = {
  public: 'عام',
  internal: 'داخلي',
  published: 'منشور',
  draft: 'مسودة',
  management: 'ملفات الإدارة',
  partner: 'شركاء',
}

export default function VisibilityBadge(props: Props) {
  const key = props.value
  return (
    <span
      className={[
        'inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-black ring-1 ring-inset',
        styles[key] ?? 'bg-slate-50 text-slate-700 ring-slate-100',
      ].join(' ')}
    >
      {labels[key] ?? key}
    </span>
  )
}

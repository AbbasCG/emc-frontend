const MAP: Record<string, { ar: string; cls: string }> = {
  draft:            { ar: 'مسودة',           cls: 'bg-slate-100 text-slate-700 ring-slate-200'   },
  pending_approval: { ar: 'بانتظار الموافقة', cls: 'bg-amber-50 text-amber-900 ring-amber-100'   },
  issued:           { ar: 'صادرة',           cls: 'bg-emerald-50 text-emerald-800 ring-emerald-100' },
  revoked:          { ar: 'ملغاة',            cls: 'bg-red-50 text-red-800 ring-red-100'          },
  active:           { ar: 'نشطة',            cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  expired:          { ar: 'منتهية',          cls: 'bg-slate-100 text-slate-500 ring-slate-200'   },
}
const DEFAULT = { ar: 'غير محدد', cls: 'bg-slate-50 text-slate-500 ring-slate-200' }

export default function CertificateStatusBadge({ status }: { status: string | null | undefined }) {
  const x = (status ? MAP[status] : null) ?? DEFAULT
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${x.cls}`}>{x.ar}</span>
}

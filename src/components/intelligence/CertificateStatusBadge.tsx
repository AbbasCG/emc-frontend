import type { CertificateStatus } from '@/types/intelligence'

const MAP: Record<CertificateStatus, { ar: string; cls: string }> = {
  draft: { ar: 'مسودة', cls: 'bg-slate-100 text-slate-700 ring-slate-200' },
  pending_approval: { ar: 'بانتظار الموافقة', cls: 'bg-amber-50 text-amber-900 ring-amber-100' },
  issued: { ar: 'صادرة', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-100' },
  revoked: { ar: 'ملغاة', cls: 'bg-red-50 text-red-800 ring-red-100' },
}

export default function CertificateStatusBadge({ status }: { status: CertificateStatus }) {
  const x = MAP[status]
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${x.cls}`}>{x.ar}</span>
}

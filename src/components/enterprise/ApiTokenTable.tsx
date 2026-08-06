import { Copy, Trash2 } from 'lucide-react'
import toast from '@/lib/toast'
import type { ApiAccessTokenRow } from '@/types/phase7'

export default function ApiTokenTable({
  rows,
  onRevoke,
}: {
  rows: ApiAccessTokenRow[]
  onRevoke: (id: number) => void
}) {
  async function copyPreview(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('تم النسخ')
    } catch {
      toast.error('تعذّر النسخ')
    }
  }

  return (
    <div dir="rtl" className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-[#F6F8FB]">
          <tr className="text-right">
            <th className="px-4 py-3 text-xs font-black text-slate-500">الاسم</th>
            <th className="px-4 py-3 text-xs font-black text-slate-500">النطاقات</th>
            <th className="px-4 py-3 text-xs font-black text-slate-500">آخر استخدام</th>
            <th className="px-4 py-3 text-xs font-black text-slate-500">معاينة</th>
            <th className="px-4 py-3 text-xs font-black text-slate-500">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50/70">
              <td className="px-4 py-3 font-black text-deepBlue">{r.name}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {(r.scopes ?? []).map((s) => (
                    <span key={s} className="rounded-md bg-sky-50 px-2 py-0.5 font-mono text-[10px] font-black text-deepBlue ring-1 ring-sky-100" dir="ltr">
                      {s}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-xs font-bold text-slate-500">
                {r.last_used_at ? new Date(r.last_used_at).toLocaleString('ar-SA') : '—'}
              </td>
              <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600" dir="ltr">
                {r.token_preview ?? '••••'}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyPreview(r.token_preview ?? r.name)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-[11px] font-black text-deepBlue ring-1 ring-slate-200 transition hover:ring-customBlue/40"
                  >
                    <Copy size={14} />
                    نسخ المعاينة
                  </button>
                  <button
                    type="button"
                    onClick={() => onRevoke(r.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-[11px] font-black text-red-800 ring-1 ring-red-100 transition hover:bg-red-100"
                  >
                    <Trash2 size={14} />
                    إبطال
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

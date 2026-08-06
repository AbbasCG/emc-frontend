import { Download } from 'lucide-react'
import toast from '@/lib/toast'
import { fetchCalendarIcsBlob } from '@/api/calendarApi'
import type { CalendarFilterKind } from '@/types/phase7'

export default function IcsDownloadButton({
  kind,
  label = 'تحميل ICS',
}: {
  kind?: CalendarFilterKind
  label?: string
}) {
  async function onDownload() {
    try {
      const blob = await fetchCalendarIcsBlob(kind)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `emc-calendar-${kind ?? 'all'}.ics`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('تم تجهيز ملف التقويم')
    } catch {
      toast.error('تعذّر تنزيل ICS حاليًا')
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onDownload()}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-deepBlue shadow-sm transition hover:border-customBlue/40 hover:text-customBlue"
    >
      <Download size={16} className="text-customOrange" />
      {label}
    </button>
  )
}

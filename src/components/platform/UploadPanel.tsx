import { UploadCloud } from 'lucide-react'
import type { DocumentVisibility } from '@/types/platform'

type Props = {
  onUpload?: (file: File, visibility: DocumentVisibility) => void
}

export default function UploadPanel({ onUpload }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-customBlue/35 bg-gradient-to-bl from-sky-50 to-white p-6 shadow-inner shadow-sky-100/50">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-customBlue text-white shadow-lg shadow-sky-200">
          <UploadCloud size={28} />
        </span>
        <div className="min-w-[200px] flex-1">
          <p className="text-sm font-black text-deepBlue">رفع ملف</p>
          <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
            اسحب الملفات هنا أو اختر من جهازك يتطلب ربط الخادم للحفظ الفعلي.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-deepBlue px-5 py-3 text-sm font-black text-white shadow-md transition hover:bg-deepBlue/90">
          اختيار ملف
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f && onUpload) onUpload(f, 'internal')
              e.target.value = ''
            }}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <span className="rounded-lg bg-white px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-100">
          الملفات الداخلية
        </span>
        <span className="rounded-lg bg-white px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-100">
          ملفات الإدارة
        </span>
      </div>
    </div>
  )
}

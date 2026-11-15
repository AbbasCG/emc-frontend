import { useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import { downloadAssignmentAttachment } from '@/api/assignmentAttachmentsApi'
import { formatFileSize } from '@/lib/assignmentUploadRules'
import toast from '@/lib/toast'
import type { AssignmentAttachment } from '@/types/lms'

type Props = {
  attachments: readonly AssignmentAttachment[]
  /** Heading above the list; pass null when the surrounding section already has one. */
  title?: string | null
  className?: string
}

/** The files of a submission, each with an authorized download (Arabic names stay intact). */
export default function AssignmentAttachmentList({ attachments, title = 'الملفات المرفقة', className = '' }: Props) {
  const [busyId, setBusyId] = useState<AssignmentAttachment['id'] | null>(null)

  if (attachments.length === 0) return null

  async function download(att: AssignmentAttachment) {
    if (busyId != null) return
    setBusyId(att.id)
    try {
      await downloadAssignmentAttachment(att)
    } catch {
      toast.error('تعذّر تنزيل الملف. حاول مرة أخرى.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={className}>
      {title ?
        <p className="mb-1.5 text-[11px] font-black text-navy/60">{title}</p>
      : null}
      <ul className="space-y-1.5" aria-label={title ?? 'الملفات المرفقة'}>
        {attachments.map((att) => {
          const size = att.size != null ? formatFileSize(att.size) : ''
          const busy = busyId === att.id
          return (
            <li
              key={att.id}
              className="flex items-center gap-2.5 rounded-xl border border-navy/10 bg-slate-50/70 px-3 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-customBlue" aria-hidden />
              <div className="min-w-0 flex-1 text-right">
                <span dir="auto" title={att.name} className="block truncate text-[12px] font-bold text-navy">
                  {att.name}
                </span>
                {size ?
                  <span className="block text-[11px] font-medium tabular-nums text-slate-500">{size}</span>
                : null}
              </div>
              <button
                type="button"
                onClick={() => void download(att)}
                disabled={busyId != null}
                aria-label={`تنزيل ${att.name}`}
                className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[12px] font-black text-customBlue transition hover:bg-customBlue/10 disabled:opacity-50"
              >
                {busy ?
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                : <Download className="h-4 w-4" aria-hidden />}
                <span className="hidden sm:inline">تنزيل</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

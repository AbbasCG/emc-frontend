import { useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { AlertCircle, FileArchive, FileImage, FilePlus2, FileSpreadsheet, FileText, Presentation, X } from 'lucide-react'
import {
  addFilesToSelection,
  formatFileSize,
  formatMegabytes,
  totalSelectionBytes,
  type AssignmentUploadRules,
  type FileRejection,
  type PickedFile,
} from '@/lib/assignmentUploadRules'

type Props = {
  files: readonly PickedFile[]
  onChange: (next: PickedFile[]) => void
  rules: AssignmentUploadRules
  /** True while an upload is in flight: nothing can be added or removed. */
  disabled?: boolean
}

function GroupIcon({ groupKey }: { groupKey: string }) {
  const cls = 'h-4 w-4 shrink-0 text-customBlue'
  switch (groupKey) {
    case 'image':
      return <FileImage className={cls} aria-hidden />
    case 'archive':
      return <FileArchive className={cls} aria-hidden />
    case 'spreadsheet':
      return <FileSpreadsheet className={cls} aria-hidden />
    case 'presentation':
      return <Presentation className={cls} aria-hidden />
    default:
      return <FileText className={cls} aria-hidden />
  }
}

/**
 * Multi-file picker for an assignment submission: an «إضافة ملفات» button (works on touch phones),
 * drag and drop on desktop, a per-file list with remove, and instant client-side validation
 * that mirrors the server rules (the server stays the authority).
 */
export default function AssignmentFilePicker({ files, onChange, rules, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [rejections, setRejections] = useState<FileRejection[]>([])
  const baseId = useId()
  const hintId = `${baseId}-hint`
  const rejectionsId = `${baseId}-rejections`

  function takeFiles(list: FileList | File[] | null | undefined) {
    if (disabled || !list) return
    const incoming = Array.from(list)
    if (incoming.length === 0) return
    const { accepted, rejected } = addFilesToSelection(files, incoming, rules)
    setRejections(rejected)
    if (accepted.length > 0) onChange([...files, ...accepted])
  }

  function handleInput(e: ChangeEvent<HTMLInputElement>) {
    takeFiles(e.target.files)
    // Allow picking the same file again after removing it.
    e.target.value = ''
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    takeFiles(e.dataTransfer.files)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    if (disabled) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    if (disabled) return
    e.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }

  function handleDragLeave() {
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }

  function remove(id: string) {
    if (disabled) return
    setRejections([])
    onChange(files.filter((f) => f.id !== id))
  }

  const totalBytes = totalSelectionBytes(files)
  const limitsLine = rules.groups.map((g) => `${g.label_ar} حتى ${formatMegabytes(g.max_bytes)} ميجابايت`).join(' · ')

  return (
    <section aria-labelledby={`${baseId}-title`} className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h3 id={`${baseId}-title`} className="text-xs font-black text-navy">
          المرفقات (اختياري)
        </h3>
        <p className="text-[11px] font-semibold tabular-nums text-slate-500">
          حتى {rules.max_files} ملفات · المجموع الأقصى {formatMegabytes(rules.max_total_bytes)} ميجابايت
        </p>
      </div>

      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="assignment-drop-zone"
        className={`flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-4 text-center transition ${
          dragging ? 'border-customBlue bg-customBlue/5' : 'border-navy/20 bg-slate-50/70'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          aria-describedby={hintId}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-customBlue/30 bg-white px-4 py-2.5 text-[13px] font-black text-customBlue transition hover:bg-customBlue/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-customBlue disabled:cursor-not-allowed sm:w-auto"
        >
          <FilePlus2 className="h-4 w-4" aria-hidden />
          إضافة ملفات
        </button>
        <p id={hintId} className="text-[11px] font-medium leading-relaxed text-slate-500">
          <span className="hidden sm:inline">أو اسحب الملفات وأفلتها هنا. </span>
          {limitsLine}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={rules.accept}
          onChange={handleInput}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          data-testid="assignment-file-input"
          className="hidden"
        />
      </div>

      {rejections.length > 0 ?
        <div
          id={rejectionsId}
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] font-bold text-rose-800"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {rejections.length === 1 ? 'لم تتم إضافة ملف واحد:' : `لم تتم إضافة ${rejections.length} ملفات:`}
            </p>
            <button
              type="button"
              onClick={() => setRejections([])}
              aria-label="إخفاء رسائل الملفات المرفوضة"
              className="-m-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-rose-700 hover:bg-rose-100"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <ul className="mt-1.5 space-y-1.5">
            {rejections.map((r, i) => (
              <li key={`${r.name}-${i}`} className="text-right">
                <bdi dir="auto" className="break-all font-black">
                  {r.name}
                </bdi>
                <span className="font-semibold"> — {r.message}</span>
              </li>
            ))}
          </ul>
        </div>
      : null}

      {files.length > 0 ?
        <>
          <ul className="space-y-1.5" aria-label="الملفات المختارة">
            {files.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2.5 rounded-xl border border-navy/10 bg-white px-3 py-2"
              >
                <GroupIcon groupKey={p.groupKey} />
                <div className="min-w-0 flex-1 text-right">
                  <span dir="auto" title={p.file.name} className="block truncate text-[12px] font-bold text-navy">
                    {p.file.name}
                  </span>
                  <span className="block text-[11px] font-medium tabular-nums text-slate-500">
                    {p.groupLabel} · {formatFileSize(p.file.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  disabled={disabled}
                  aria-label={`إزالة الملف ${p.file.name}`}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] font-semibold tabular-nums text-slate-500" data-testid="assignment-files-summary">
            {files.length} من {rules.max_files} ملفات · {formatFileSize(totalBytes)} من {formatMegabytes(rules.max_total_bytes)} ميجابايت
          </p>
        </>
      : null}
    </section>
  )
}

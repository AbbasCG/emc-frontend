import { useId, useRef, useState } from 'react'
import { FileUp, Paperclip, X } from 'lucide-react'
import { CV_ACCEPT, CV_INSTRUCTION, formatFileSize, validateCvFile } from '@/utils/cvFile'

/**
 * The CV upload used by every EMC form that asks for one: PDF only, with the instruction, the chosen file's name
 * and size, and an accessible error. An unacceptable file is refused here (the previous valid choice stays), and
 * the server checks again. `error` is for a message the form itself or the server produced.
 */
export function CvFileField({
  label = 'السيرة الذاتية',
  file,
  onChange,
  error,
  required = false,
  disabled = false,
}: {
  label?: string
  file: File | null
  onChange: (file: File | null) => void
  error?: string | null
  required?: boolean
  disabled?: boolean
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [local, setLocal] = useState<string | null>(null)
  const shown = local ?? error ?? null
  const describedBy = `${id}-hint${shown ? ` ${id}-error` : ''}`

  async function pick(next: File | null) {
    if (!next) {
      setLocal(null)
      onChange(null)

      return
    }
    const problem = await validateCvFile(next)
    if (problem) {
      setLocal(problem)
      if (input.current) input.current.value = ''

      return
    }
    setLocal(null)
    onChange(next)
  }

  return (
    <div className="text-right">
      <span className="mb-1.5 block text-sm font-black text-deepBlue" id={`${id}-label`}>
        {label}
        {required ? <span className="me-1 text-red-500"> *</span> : null}
      </span>
      <input
        ref={input}
        id={id}
        type="file"
        accept={CV_ACCEPT}
        className="sr-only"
        disabled={disabled}
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy}
        aria-invalid={shown ? true : undefined}
        aria-required={required || undefined}
        onChange={(e) => void pick(e.target.files?.[0] ?? null)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className={`inline-flex items-center gap-2 rounded-xl border border-dashed px-5 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40 ${
            shown ? 'border-red-400 bg-red-50/40 text-red-700' : file ? 'border-customBlue/50 bg-brand-50 text-customBlue' : 'border-muted-300 bg-paper2 text-foreground/70 hover:border-customBlue/50 hover:bg-brand-50 hover:text-customBlue'
          }`}
        >
          {file ?
            <>
              <Paperclip size={16} aria-hidden />
              <span className="max-w-[240px] truncate" dir="ltr">{file.name}</span>
              <span className="text-[11px] font-semibold opacity-70" data-testid="cv-size">{formatFileSize(file.size)}</span>
            </>
          : <>
              <FileUp size={16} aria-hidden /> رفع السيرة الذاتية (PDF)
            </>}
        </button>
        {file ?
          <button type="button" disabled={disabled} onClick={() => { if (input.current) input.current.value = ''; void pick(null) }} aria-label="إزالة الملف" className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-700">
            <X size={13} aria-hidden /> حذف
          </button>
        : null}
      </div>
      <p id={`${id}-hint`} className="mt-1.5 text-[11px] font-semibold text-slate-500">{CV_INSTRUCTION}</p>
      {shown ? <p id={`${id}-error`} role="alert" className="mt-1 text-[12px] font-bold text-red-600">{shown}</p> : null}
    </div>
  )
}

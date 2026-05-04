import { ImagePlus, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import AppFormError from './AppFormError'

type AppFileUploadProps = {
  label: string
  name: string
  file: File | null
  onChange: (file: File | null) => void
  error?: string
  required?: boolean
  accept?: string
  hint?: string
}

export default function AppFileUpload({
  label,
  name,
  file,
  onChange,
  error,
  required = false,
  accept,
  hint,
}: AppFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const generatedId = useId()
  const inputId = `${name}-${generatedId}`
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const [isDragging, setIsDragging] = useState(false)

  const applyFile = (selectedFile: File | undefined) => {
    if (selectedFile) onChange(selectedFile)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    applyFile(event.target.files?.[0])
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragging(false)
    applyFile(event.dataTransfer.files?.[0])
  }

  const handleRemove = () => {
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 KB'
    const sizeInMb = bytes / 1024 / 1024
    return sizeInMb >= 1 ? `${sizeInMb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
  }

  return (
    <div className="grid gap-2 text-right">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-bold text-deepBlue">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
        {hint && (
          <span id={hintId} className="text-xs font-medium text-slate-500">
            {hint}
          </span>
        )}
      </div>

      {file ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-bold text-red-700 transition hover:bg-red-50"
          >
            <X size={18} aria-hidden="true" />
            إزالة
          </button>
          <div className="min-w-0 text-right">
            <p className="truncate font-bold text-deepBlue">{file.name}</p>
            <p className="text-xs font-medium text-slate-500">{formatFileSize(file.size)}</p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={[
            'flex min-h-32 items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center outline-none transition focus-visible:ring-4',
            error
              ? 'border-red-300 bg-red-50 focus-visible:ring-red-100'
              : isDragging
                ? 'border-[#b9872f] bg-amber-50 focus-visible:ring-amber-100'
                : 'border-amber-200 bg-white hover:border-[#b9872f] hover:bg-amber-50 focus-visible:ring-amber-100',
          ].join(' ')}
          aria-describedby={[hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined}
        >
          <ImagePlus size={26} className={error ? 'text-red-600' : 'text-[#b9872f]'} aria-hidden="true" />
          <span className="text-right">
            <span className={`block font-bold ${error ? 'text-red-700' : 'text-deepBlue'}`}>اضغط لتحميل الصورة</span>
            <span className="block text-sm font-medium text-slate-500">أو اسحب الملف إلى هذه المساحة</span>
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        name={name}
        accept={accept}
        required={required}
        onChange={handleFileChange}
        className="sr-only"
        aria-invalid={Boolean(error)}
      />

      {error && <AppFormError id={errorId} message={error} />}
    </div>
  )
}

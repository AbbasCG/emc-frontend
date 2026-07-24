import { Check, FileText, ImagePlus, Loader2, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { cn } from '@/lib/utils'
import AppFormError from './AppFormError'
import {
  compressImage,
  IMAGE_MAX_INPUT_BYTES,
  isCompressibleImage,
} from '@/utils/compressImage'
import type { CompressionResult, ImageContext } from '@/utils/compressImage'
import { compressPdf, PDF_MAX_INPUT_BYTES, PDF_MAX_OUTPUT_BYTES } from '@/utils/compressPdf'

type AppFileUploadProps = {
  label: string
  name: string
  file: File | null
  onChange: (file: File | null) => void
  error?: string
  required?: boolean
  accept?: string
  hint?: string
  /** Enable client-side compression. Default: auto-detect from file type. */
  compress?: boolean
  /**
   * Upload context for automatic profile selection.
   * avatar/profile/instructor/student → 512px ≤150KB WebP
   * course/workshop/certificate       → 1200px ≤500KB WebP
   * banner/hero                       → 1920px ≤1MB   WebP
   */
  imageContext?: ImageContext
}

type CompressPhase = 'idle' | 'compressing' | 'done' | 'error'

type CompressState = {
  phase: CompressPhase
  progress: number
  result: CompressionResult | null
  errorMsg: string | null
}

const IDLE: CompressState = { phase: 'idle', progress: 0, result: null, errorMsg: null }

function formatBytes(bytes: number): string {
  const mb = bytes / 1024 / 1024
  return mb >= 1 ? `${mb.toFixed(1)} ميجابايت` : `${Math.round(bytes / 1024)} كيلوبايت`
}

function getValidationError(file: File, isImage: boolean, isPdf: boolean): string | null {
  if (isImage && file.size > IMAGE_MAX_INPUT_BYTES) {
    return `الصورة أكبر من ${IMAGE_MAX_INPUT_BYTES / 1024 / 1024} ميجابايت. الرجاء اختيار صورة أصغر.`
  }
  if (isPdf && file.size > PDF_MAX_INPUT_BYTES) {
    return `ملف PDF أكبر من ${PDF_MAX_INPUT_BYTES / 1024 / 1024} ميجابايت. الرجاء اختيار ملف أصغر.`
  }
  return null
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
  compress,
  imageContext,
}: AppFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const generatedId = useId()
  const inputId = `${name}-${generatedId}`
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const [isDragging, setIsDragging] = useState(false)
  const [cs, setCs] = useState<CompressState>(IDLE)

  // Reset compression state when the parent clears the file — adjusted during render
  // so a cleared field never paints stale compression progress.
  const [seenFile, setSeenFile] = useState(file)
  if (seenFile !== file) {
    setSeenFile(file)
    if (file === null) setCs(IDLE)
  }

  const applyFile = async (raw: File | undefined) => {
    if (!raw) return

    setCs(IDLE)

    const isImage = isCompressibleImage(raw)
    const isPdf = raw.type === 'application/pdf'
    const shouldCompress = compress ?? (isImage || isPdf)

    // Validate size before anything
    const sizeErr = getValidationError(raw, isImage, isPdf)
    if (sizeErr) {
      setCs({ phase: 'error', progress: 0, result: null, errorMsg: sizeErr })
      return
    }

    if (!shouldCompress || (!isImage && !isPdf)) {
      onChange(raw)
      return
    }

    setCs({ phase: 'compressing', progress: 0, result: null, errorMsg: null })

    try {
      let result: CompressionResult

      if (isImage) {
        result = await compressImage(
          raw,
          (pct) => setCs((prev) => ({ ...prev, progress: pct })),
          imageContext,
        )
      } else {
        result = await compressPdf(raw, (pct) =>
          setCs((prev) => ({ ...prev, progress: pct })),
        )
        if (result.compressedSize > PDF_MAX_OUTPUT_BYTES) {
          setCs({ phase: 'done', progress: 100, result, errorMsg: 'الملف كبير جداً وتم ضغطه تلقائياً.' })
          onChange(result.file)
          return
        }
      }

      setCs({ phase: 'done', progress: 100, result, errorMsg: null })
      onChange(result.file)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء معالجة الملف'
      setCs({ phase: 'error', progress: 0, result: null, errorMsg: msg })
      // Fall back to original file so the form is not blocked
      onChange(raw)
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void applyFile(event.target.files?.[0])
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragging(false)
    void applyFile(event.dataTransfer.files?.[0])
  }

  const handleRemove = () => {
    onChange(null)
    setCs(IDLE)
    if (inputRef.current) inputRef.current.value = ''
  }

  const isPdf = file?.type === 'application/pdf'

  return (
    <div className="grid gap-2 text-right">
      {/* Label row */}
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

      {/* Compressing state */}
      {cs.phase === 'compressing' && (
        <div className="rounded-xl border border-customBlue/20 bg-blue-50 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <Loader2 size={15} className="animate-spin text-customBlue" aria-hidden="true" />
            <span className="text-sm font-bold text-deepBlue">جارٍ ضغط الملف وتحسينه…</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-1.5 rounded-full bg-customBlue transition-all duration-200"
              style={{ width: `${cs.progress}%` }}
              role="progressbar"
              aria-valuenow={cs.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="mt-1 text-left text-xs font-medium text-slate-500">{cs.progress}%</p>
        </div>
      )}

      {/* File selected (idle / done / error-with-fallback) */}
      {file && cs.phase !== 'compressing' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-bold text-red-700 transition hover:bg-red-50"
            >
              <X size={16} aria-hidden="true" />
              إزالة
            </button>
            <div className="flex min-w-0 items-center gap-2 text-right">
              {isPdf
                ? <FileText size={18} className="shrink-0 text-customBlue" aria-hidden="true" />
                : <ImagePlus size={18} className="shrink-0 text-[#DD7C02]" aria-hidden="true" />
              }
              <div className="min-w-0">
                <p className="truncate font-bold text-deepBlue">{file.name}</p>
                <p className="text-xs font-medium text-slate-500">{formatBytes(file.size)}</p>
              </div>
            </div>
          </div>

          {/* Compression stats */}
          {cs.phase === 'done' && cs.result && cs.result.savedPercent > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center justify-start gap-2 border-t border-amber-100 pt-2.5 text-xs">
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-black text-emerald-700">
                <Check size={11} aria-hidden="true" />
                وفّرنا {cs.result.savedPercent}%
              </span>
              <span className="text-slate-500 line-through">{formatBytes(cs.result.originalSize)}</span>
              <span className="font-bold text-emerald-600">{formatBytes(cs.result.compressedSize)}</span>
            </div>
          )}

          {/* Warning when compressed but still large */}
          {cs.phase === 'done' && cs.errorMsg && (
            <p className="mt-1.5 text-right text-xs font-medium text-amber-700">{cs.errorMsg}</p>
          )}
        </div>
      )}

      {/* Empty drop zone */}
      {!file && cs.phase !== 'compressing' && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex min-h-32 items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center outline-none transition',
            error
              ? 'border-red-300 bg-red-50 focus-visible:ring-4 focus-visible:ring-red-100'
              : isDragging
                ? 'border-[#DD7C02] bg-amber-50 emc-focus-ring'
                : 'border-amber-200 bg-white hover:border-[#DD7C02] hover:bg-amber-50 emc-focus-ring',
          )}
          aria-describedby={
            [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined
          }
        >
          <ImagePlus size={26} className={error ? 'text-red-600' : 'text-[#DD7C02]'} aria-hidden="true" />
          <span className="text-right">
            <span className={`block font-bold ${error ? 'text-red-700' : 'text-deepBlue'}`}>
              اضغط لتحميل الملف
            </span>
            <span className="block text-sm font-medium text-slate-500">
              أو اسحب الملف إلى هذه المساحة
            </span>
          </span>
        </button>
      )}

      {/* Compression error (when no fallback file) */}
      {cs.phase === 'error' && !file && cs.errorMsg && (
        <p className="text-right text-xs font-bold text-red-600">{cs.errorMsg}</p>
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

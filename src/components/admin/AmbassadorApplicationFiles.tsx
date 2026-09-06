import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Eye,
  FileText,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react'
import {
  getApplicationFiles,
  deleteApplicationFile,
  fetchAmbassadorFileBlob,
  type AmbassadorFileRecord,
} from '@/api/ambassadorApplicationFilesApi'
import { LmsPreviewModal, type LmsPreviewState } from '@/components/lms/management/LmsPreviewModal'
import { formatDate } from '@/utils/dateTime'
import toast from '@/lib/toast'

// ── Helpers ───────────────────────────────────────────────────────────────────

function isImage(file: AmbassadorFileRecord): boolean {
  return file.mime_type.startsWith('image/')
}

function formatBytes(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${bytes} B`
}

const STATUS_BADGE: Record<
  AmbassadorFileRecord['processing_status'],
  { label: string; className: string }
> = {
  uploaded: { label: 'تم الرفع', className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80' },
  processing: { label: 'قيد المعالجة', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80' },
  optimized: { label: 'تم التحسين', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80' },
  failed: { label: 'فشلت المعالجة', className: 'bg-red-50 text-red-700 ring-1 ring-red-200/80' },
  skipped: { label: 'لم تتم المعالجة', className: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200/80' },
}

const EXTENSION_COLORS: Record<string, string> = {
  pdf: 'bg-red-50 text-red-700',
  jpg: 'bg-sky-50 text-sky-700',
  jpeg: 'bg-sky-50 text-sky-700',
  png: 'bg-violet-50 text-violet-700',
  webp: 'bg-indigo-50 text-indigo-700',
}

// ── File card (styled to match LMS MaterialCard) ────────────────────────────────

function FileCard({
  file,
  onPreview,
  onDelete,
  canDelete,
}: {
  file: AmbassadorFileRecord
  onPreview: (f: AmbassadorFileRecord) => void
  onDelete: (f: AmbassadorFileRecord) => void
  canDelete: boolean
}) {
  const statusInfo = STATUS_BADGE[file.processing_status]
  const extColor = EXTENSION_COLORS[file.extension] ?? 'bg-slate-100 text-slate-600'

  return (
    <div className="group flex items-start gap-4 rounded-2xl border border-[#0C2A4B]/6 bg-white p-4 shadow-sm transition hover:border-[#0077B6]/20 hover:shadow-md">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F8FAFC] ring-1 ring-[#0C2A4B]/6">
        {isImage(file) && file.has_thumbnail && file.thumbnail_url ? (
          <img src={file.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : isImage(file) ? (
          <ImageIcon className="h-5 w-5 text-slate-300" />
        ) : (
          <FileText className="h-5 w-5 text-red-400" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-bold text-[#0C2A4B]" title={file.original_name}>
            {file.original_name}
          </p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${extColor}`}>
            .{file.extension}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-[#0077B6]/80">{file.category_label}</p>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-medium text-[#0C2A4B]/35">
              {file.uploaded_at ? formatDate(file.uploaded_at) : ''}
            </p>
            {file.processing_status === 'optimized' && file.optimized_size ? (
              <span className="font-latin text-[11px] font-bold text-emerald-700" dir="ltr">
                {formatBytes(file.original_size)} → {formatBytes(file.optimized_size)}
                {file.compression_ratio ? ` (${Math.round(file.compression_ratio)}%)` : ''}
              </span>
            ) : (
              <span className="font-latin text-[11px] font-medium text-[#0C2A4B]/25">{file.file_size_humans}</span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          </div>
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(file)}
              className="rounded-lg p-1.5 text-[#0C2A4B]/40 transition hover:bg-red-50 hover:text-red-600"
              title="حذف"
              aria-label="حذف"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2">
          {file.has_preview && (
            <button
              type="button"
              onClick={() => onPreview(file)}
              className="flex items-center gap-1 rounded-lg bg-[#0077B6]/10 px-2.5 py-1 text-[11px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/20"
            >
              <Eye size={11} aria-hidden /> معاينة
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function DeleteDialog({
  file,
  onConfirm,
  onCancel,
}: {
  file: AmbassadorFileRecord
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" dir="rtl">
        <h3 className="mb-2 text-sm font-bold text-[#0F172A]">حذف الملف</h3>
        <p className="mb-5 text-xs font-medium text-slate-500">
          هل أنت متأكد من حذف <span className="font-bold text-[#0C2A4B]">{file.original_name}</span>؟
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              setDeleting(true)
              try {
                await onConfirm()
              } finally {
                setDeleting(false)
              }
            }}
            disabled={deleting}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {deleting ? 'جارٍ الحذف...' : 'حذف'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-[#0C2A4B]"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-4">
          <div className="mb-3 h-28 rounded-xl bg-slate-100" />
          <div className="mb-2 h-3 w-2/3 rounded bg-slate-100" />
          <div className="h-3 w-1/2 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export type AmbassadorApplicationFilesProps = {
  applicationId: number
  embedded?: boolean
  canDelete?: boolean
}

export default function AmbassadorApplicationFiles({
  applicationId,
  embedded = false,
  canDelete = true,
}: AmbassadorApplicationFilesProps) {
  const [files, setFiles] = useState<AmbassadorFileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<AmbassadorFileRecord | null>(null)
  const [preview, setPreview] = useState<LmsPreviewState>({ kind: 'idle' })
  const objectUrlRef = useRef<string | null>(null)

  // Return to the loading state during render when the application changes, so the
  // list never paints the previous application's files (react.dev "adjusting state").
  const [seenApplicationId, setSeenApplicationId] = useState(applicationId)
  if (seenApplicationId !== applicationId) {
    setSeenApplicationId(applicationId)
    setLoading(true)
    setError(null)
  }

  // Imperative re-run from event handlers (retry button, post-delete refresh) —
  // outside an effect, so it may flip to the loading state synchronously.
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getApplicationFiles(applicationId)
      setFiles(data)
    } catch {
      setError('فشل تحميل الملفات. يرجى المحاولة مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const data = await getApplicationFiles(applicationId)
        if (!alive) return
        setFiles(data)
        setError(null)
      } catch {
        if (!alive) return
        setError('فشل تحميل الملفات. يرجى المحاولة مرة أخرى.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [applicationId])

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    },
    [],
  )

  const closePreview = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setPreview({ kind: 'idle' })
  }, [])

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await deleteApplicationFile(applicationId, toDelete.id)
      toast.success('تم حذف الملف')
      setToDelete(null)
      await load()
    } catch {
      toast.error('فشل حذف الملف')
    }
  }

  const handlePreview = async (file: AmbassadorFileRecord) => {
    setPreview({ kind: 'loading', label: 'جاري تحميل الملف…' })
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    try {
      const { blob, mime, filename } = await fetchAmbassadorFileBlob(applicationId, file.id, 'preview')
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      setPreview({ kind: 'open', objectUrl: url, fileName: filename || file.original_name, mime: mime || file.mime_type })
    } catch {
      setPreview({ kind: 'error', message: 'تعذّر تحميل الملف للمعاينة.' })
    }
  }

  const inner = (
    <>
      {loading && <Skeleton />}

      {!loading && error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
          <p className="text-xs font-bold text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mr-auto text-xs font-bold text-red-600 underline"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {!loading && !error && files.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-[#F8FAFC] py-10 text-center">
          <FileText className="h-8 w-8 text-slate-300" />
          <p className="text-xs font-bold text-slate-400">لا توجد ملفات مرفقة لهذا الطلب</p>
        </div>
      )}

      {!loading && !error && files.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onPreview={(f) => void handlePreview(f)}
              onDelete={(f) => setToDelete(f)}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}

      <LmsPreviewModal state={preview} onClose={closePreview} />

      {toDelete && (
        <DeleteDialog
          file={toDelete}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  )

  if (embedded) return <div dir="rtl">{inner}</div>

  return (
    <div className="rounded-2xl border border-[#0C2A4B]/[0.06] bg-white p-5 shadow-sm" dir="rtl">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-[#0C2A4B]">المرفقات والملفات</h3>
        {!loading && files.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
            {files.length} ملف
          </span>
        )}
      </div>
      {inner}
    </div>
  )
}

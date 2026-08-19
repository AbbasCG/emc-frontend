import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { fetchDocumentFolders, fetchDocuments, uploadDocument } from '@/api/documentsApi'
import DocumentCard from '@/components/platform/DocumentCard'
import FolderTree from '@/components/platform/FolderTree'
import UploadPanel from '@/components/platform/UploadPanel'
import EmptyState from '@/components/dashboard/EmptyState'
import type { DocumentFolder, PlatformDocument } from '@/types/platform'

export default function DocumentsPage() {
  const [folders, setFolders] = useState<DocumentFolder[]>([])
  const [docs, setDocs] = useState<PlatformDocument[]>([])
  const [folderId, setFolderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [f, d] = await Promise.all([
        fetchDocumentFolders(),
        fetchDocuments(folderId ? { folder: folderId } : {}),
      ])
      if (!cancelled) {
        setFolders(f)
        setDocs(d)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [folderId])

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">Documents</p>
        <h1 className="text-2xl font-black text-deepBlue">الملفات</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-slate-500">
          المجلدات، رفع ملف، والملفات الداخلية وملفات الإدارة جاهز للربط مع صلاحيات الخادم.
        </p>
      </motion.div>

      <UploadPanel
        onUpload={async (file) => {
          const fd = new FormData()
          fd.append('file', file)
          try {
            const created = await uploadDocument(fd)
            setDocs((prev) => [created, ...prev])
          } catch {
            /* يُعرض تنبيه عند ربط الخادم */
          }
        }}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <FolderTree folders={folders} selectedId={folderId} onSelect={setFolderId} />
        <div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <EmptyState title="لا مستندات" description="ارفع ملفاً أو غيّر المجلد لعرض المحتوى." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {docs.map((d) => (
                <DocumentCard key={d.id} doc={d} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

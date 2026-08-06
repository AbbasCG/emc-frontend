import { useEffect, useState } from 'react'
import { fetchDocuments } from '@/api/documentsApi'
import DocumentCard from '@/components/platform/DocumentCard'
import UploadPanel from '@/components/platform/UploadPanel'

export default function PartnerDocumentsPage() {
  const [docs, setDocs] = useState<Awaited<ReturnType<typeof fetchDocuments>>>([])
  useEffect(() => {
    let c = false
    ;(async () => {
      const d = await fetchDocuments()
      if (!c) setDocs(d.filter((x) => x.visibility === 'partner' || x.related_label))
    })()
    return () => {
      c = true
    }
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white">مستندات الشراكة</h2>
        <p className="mt-2 text-sm font-medium text-white/60">رفع وعرض ملفات بصلاحيات مخصصة للشركاء.</p>
      </div>
      <div className="rounded-2xl bg-white p-4 shadow-xl">
        <UploadPanel />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {docs.map((d) => (
          <DocumentCard key={d.id} doc={d} />
        ))}
      </div>
    </div>
  )
}

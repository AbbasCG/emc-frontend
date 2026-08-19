import DocumentsPage from '@/pages/platform/DocumentsPage'

export default function AdminDocumentsPage() {
  return (
    <div>
      <div className="mb-6 rounded-2xl border border-customOrange/30 bg-gradient-to-l from-customOrange/10 to-white px-5 py-4 text-sm font-bold text-deepBlue ring-1 ring-customOrange/20">
        عرض الإدارة نفس تجربة المستندات مع سياسات أوضح عند ربط الصلاحيات في الخادم.
      </div>
      <DocumentsPage />
    </div>
  )
}

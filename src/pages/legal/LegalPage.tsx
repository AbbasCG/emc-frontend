import { Navigate, useLocation } from 'react-router-dom'
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout'
import { ALL_LEGAL_DOCUMENTS } from '@/data/legal'

export default function LegalPage() {
  const { pathname } = useLocation()
  const doc = ALL_LEGAL_DOCUMENTS.find((d) => d.route === pathname)
  if (!doc) return <Navigate to="/404" replace />
  return <LegalDocumentLayout doc={doc} />
}

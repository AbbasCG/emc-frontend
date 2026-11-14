import { Activity } from 'lucide-react'
import { HubTabPlaceholder } from './HubTabPlaceholder'

export default function ActivityTab() {
  return (
    <HubTabPlaceholder
      Icon={Activity}
      titleAr="النشاط"
      descriptionAr="المستخدمون الذين سجلوا الدخول، وتسجيلات الدخول والعودة إلى المنصة."
    />
  )
}

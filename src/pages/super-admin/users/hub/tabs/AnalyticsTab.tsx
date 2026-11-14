import { BarChart3 } from 'lucide-react'
import { HubTabPlaceholder } from './HubTabPlaceholder'

export default function AnalyticsTab() {
  return (
    <HubTabPlaceholder
      Icon={BarChart3}
      titleAr="التحليلات"
      descriptionAr="إحصائيات الحسابات ونمو المستخدمين، مع مقارنة بالفترة السابقة."
    />
  )
}

import { Megaphone } from 'lucide-react'
import { HubTabPlaceholder } from './HubTabPlaceholder'

export default function AcquisitionTab() {
  return (
    <HubTabPlaceholder
      Icon={Megaphone}
      titleAr="الاستقطاب"
      descriptionAr="مصادر وصول الأعضاء كما يعلنونها، وزيارات الحملات، مع بيان ما لا تتوفر بياناته."
    />
  )
}

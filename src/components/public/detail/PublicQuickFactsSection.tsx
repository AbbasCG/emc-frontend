import PublicDetailInfoCards, { type PublicInfoCard } from '@/components/public/detail/PublicDetailInfoCards'
import PublicDetailSection from '@/components/public/detail/PublicDetailSection'

type Props = {
  items: PublicInfoCard[]
}

export default function PublicQuickFactsSection({ items }: Props) {
  if (items.length === 0) return null

  return (
    <PublicDetailSection id="quick-facts" title="معلومات سريعة" compact>
      <PublicDetailInfoCards items={items} />
    </PublicDetailSection>
  )
}

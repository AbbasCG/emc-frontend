import PublicSeo from '@/components/public/PublicSeo'
import TeamPage from '@/components/team/TeamPage'

export default function Team() {
  return (
    <>
      <PublicSeo
        title="الفريق والهيكل الإداري"
        description="تعرّف على الهيكل الإداري الرسمي لمركز EMC: القيادة التنفيذية والإدارات المتخصصة التي تعمل كفريق واحد لبناء منصة تعليمية تصنع أثراً حقيقياً في المجتمع."
        path="/team"
      />
      <TeamPage />
    </>
  )
}

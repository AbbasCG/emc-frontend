import { motion } from 'framer-motion'
import type { TeamMember as TeamMemberModel } from '@/services/teamApi'
import { resolveTeamMemberImage } from '@/services/teamApi'

function initialsArabic(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[parts.length - 2]?.charAt(0) ?? ''
    const b = parts[parts.length - 1]?.charAt(0) ?? ''
    const s = `${a}${b}`.trim()
    return s || '?'
  }
  return parts[0]?.slice(0, 2) ?? '؟'
}

type Props = {
  member: TeamMemberModel
  departmentBadge: string
  /** Subtle EMC accent highlight (orange ring)—does not change card size */
  featured?: boolean
}

export default function TeamMemberCard({ member, departmentBadge, featured }: Props) {
  const img = resolveTeamMemberImage(member.image)
  const init = initialsArabic(member.name_ar)

  return (
    <motion.article
      dir="rtl"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.38, ease: [0.22, 0.61, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.22, ease: 'easeOut' } }}
      className={`group flex h-full max-h-[20rem] min-h-[10.75rem] flex-row items-center gap-3 overflow-hidden rounded-3xl border border-deepBlue/[0.08] bg-white p-3.5 text-right shadow-emc-md shadow-deepBlue/[0.06] transition-shadow hover:border-customBlue/[0.28] hover:shadow-emc-lg sm:gap-4 sm:p-4 ${
        featured ? 'ring-1 ring-customOrange/[0.32]' : ''
      }`}
    >
      <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl border border-deepBlue/[0.06] bg-gradient-to-br from-customBlue/[0.09] to-deepBlue/[0.04] shadow-inner sm:h-[5rem] sm:w-[5rem]">
        {img ? (
          <img
            src={img}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-display text-xl font-black text-customBlue sm:text-2xl">{init}</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-0.5">
        <h3 className="line-clamp-2 text-[0.95rem] font-black leading-snug text-deepBlue sm:text-base">{member.name_ar}</h3>

        <p className="line-clamp-2 text-[12px] font-semibold leading-relaxed text-deepBlue/72 sm:text-[13px]">
          {member.position_ar}
        </p>

        <span className="inline-flex w-fit max-w-full items-center rounded-full border border-customBlue/[0.2] bg-brand-50 px-2.5 py-0.5 text-[10px] font-black leading-tight text-customBlue sm:text-[11px]">
          {departmentBadge}
        </span>

        {(member.is_executive || member.is_leader) && (
          <div className="mt-0.5 flex flex-wrap justify-start gap-1">
            {member.is_executive ? (
              <span className="rounded-lg border border-deepBlue/15 bg-deepBlue px-2 py-0.5 text-[9px] font-black text-white sm:text-[10px]">
                الإدارة العليا
              </span>
            ) : null}
            {member.is_leader ? (
              <span className="rounded-lg border border-customOrange/35 bg-accent-50 px-2 py-0.5 text-[9px] font-black text-deepBlue sm:text-[10px]">
                قائد الإدارة
              </span>
            ) : null}
          </div>
        )}
      </div>
    </motion.article>
  )
}

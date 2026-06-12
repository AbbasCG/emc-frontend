import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Award, Calendar, Clock, MapPin, Users, Wifi } from 'lucide-react'
import type { PublicWorkshop } from '@/api/workshopsApi.public'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import { EMC_COURSE_COVER_PLACEHOLDER } from '@/utils/publicCourseDisplay'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'يُحدَّد لاحقاً'
  try {
    return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(
      new Date(dateStr),
    )
  } catch {
    return dateStr
  }
}

type WorkshopCardProps = {
  workshop: PublicWorkshop
  index?: number
  layout?: 'grid' | 'list'
}

export default function WorkshopCard({ workshop, index = 0, layout = 'grid' }: WorkshopCardProps) {
  const cover = resolvePublicAssetUrl(workshop.cover_image) ?? EMC_COURSE_COVER_PLACEHOLDER
  const spots =
    workshop.seats_remaining != null ?
      workshop.seats_remaining
    : workshop.seats_total != null ?
      workshop.seats_total
    : null

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className={
        layout === 'list' ?
          'group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100 transition hover:border-[#2691C2]/35 hover:shadow-lg sm:flex-row'
        : 'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100 transition hover:border-[#2691C2]/35 hover:shadow-lg'
      }
    >
      <Link
        to={`/workshops/${workshop.slug}`}
        className={
          layout === 'list' ?
            'relative aspect-[16/10] shrink-0 overflow-hidden bg-slate-100 sm:w-72'
          : 'relative aspect-[16/10] overflow-hidden bg-slate-100'
        }
      >
        <img src={cover} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#22334A]/75 via-transparent to-transparent" />
        <div className="absolute start-3 top-3 flex flex-wrap gap-2">
          <span
            className={`rounded-lg px-2.5 py-1 text-[10px] font-black ${
              workshop.is_free ? 'bg-emerald-500 text-white' : 'bg-[#EC943C] text-white'
            }`}
          >
            {workshop.is_free ? 'مجانية' : 'برسوم'}
          </span>
          <span className="rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-black text-deepBlue backdrop-blur">
            {workshop.is_online ?
              'أونلاين'
            : workshop.location_type === 'offline' ?
              'حضوري'
            : 'مختلط'}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5 text-right">
        {workshop.certificate_name ?
          <p className="mb-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#2691C2]">
            <Award className="h-3.5 w-3.5" />
            {workshop.certificate_name}
          </p>
        : null}
        <Link to={`/workshops/${workshop.slug}`}>
          <h3 className="line-clamp-2 text-base font-black leading-snug text-deepBlue transition group-hover:text-[#2691C2]">
            {workshop.title}
          </h3>
        </Link>
        {workshop.instructor_name ?
          <p className="mt-2 text-[12px] font-semibold text-slate-500">مع {workshop.instructor_name}</p>
        : null}

        <div className="mt-4 space-y-2 text-[11px] font-semibold text-slate-600">
          <p className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-[#2691C2]" />
            {formatDate(workshop.start_date)}
            {workshop.start_time ? ` · ${workshop.start_time}` : ''}
          </p>
          {workshop.duration_hours ?
            <p className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0 text-[#EC943C]" />
              {workshop.duration_hours} ساعات
            </p>
          : null}
          <p className="flex items-center gap-2">
            {workshop.is_online ?
              <Wifi className="h-3.5 w-3.5 shrink-0 text-[#2691C2]" />
            : <MapPin className="h-3.5 w-3.5 shrink-0 text-[#EC943C]" />}
            {workshop.is_online ? 'عن بُعد' : 'حضوري / مختلط'}
          </p>
          {spots != null ?
            <p className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 shrink-0 text-deepBlue" />
              {spots > 0 ? `${spots} مقعد متاح` : 'اكتمل العدد'}
            </p>
          : null}
        </div>

        <Link
          to={`/workshops/${workshop.slug}`}
          className="mt-auto pt-5 text-[12px] font-black text-[#2691C2] transition hover:text-deepBlue"
        >
          عرض التفاصيل ←
        </Link>
      </div>
    </motion.article>
  )
}

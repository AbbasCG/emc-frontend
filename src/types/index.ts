import type { LucideIcon } from 'lucide-react'

export type Course = {
  id: number
  title: string
  slug: string
  description?: string | null
  short_description?: string | null
  instructor_name?: string | null
  type: 'free' | 'paid'
  price: number | string
  location?: string | null
  is_online: boolean | number
  start_date?: string | null
  end_date?: string | null
  capacity?: number | null
  status?: string

  duration?: string | null
  training_hours?: number | null
  target_audience?: string | null
  language?: string | null
  level?: string | null
  study_days?: string | null
  study_time?: string | null
  certificate?: string | null
  course_image?: string | null

  instructor?: {
    id: number
    name: string
    title?: string | null
    bio?: string | null
    image?: string | null
  } | null

  features?: {
    id: number
    course_id?: number
    title: string
    sort_order?: number
  }[]
}

export type CourseFilter = 'all' | 'free' | 'paid' | 'online' | 'offline'

export type NavLinkItem = {
  label: string
  href: string
}

export type IconComponent = LucideIcon

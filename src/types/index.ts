import type { LucideIcon } from 'lucide-react'

export type Course = {
  id: number
  title: string
  slug: string
  description?: string
  short_description?: string
  instructor_name?: string
  type: 'free' | 'paid'
  price?: number | string | null
  location?: string | null
  is_online?: boolean | number
  start_date?: string | null
  end_date?: string | null
  capacity?: number | null
  status?: string
}

export type CourseFilter = 'all' | 'free' | 'paid' | 'online' | 'offline'

export type NavLinkItem = {
  label: string
  href: string
}

export type IconComponent = LucideIcon

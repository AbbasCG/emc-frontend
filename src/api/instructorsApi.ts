import apiClient from './axios'
import { unwrapData } from './unwrap'

export type InstructorPublic = {
  id: number
  name: string
  slug: string
  title?: string | null
  bio?: string | null
  expertise?: string | null
  specialization?: string | null
  image_url?: string | null
  courses_count?: number
  workshops_count?: number
  learning_paths_count?: number
  courses?: { id: number; slug: string; title: string; image_url?: string | null }[]
  learning_paths?: { id: number; slug: string; title: string }[]
  /** Whether the instructor has public contact info exposed */
  show_contact?: boolean | null
  email?: string | null
  phone?: string | null
}

export async function fetchInstructors(): Promise<InstructorPublic[]> {
  const res = await apiClient.get<{ data: InstructorPublic[] }>('/instructors')
  const list = unwrapData<InstructorPublic[]>(res.data)
  return Array.isArray(list) ? list : []
}

export async function fetchInstructor(identifier: string): Promise<InstructorPublic | null> {
  try {
    const res = await apiClient.get<{ data: InstructorPublic }>(`/instructors/${identifier}`)
    const row = unwrapData<InstructorPublic>(res.data)
    return row?.id ? row : null
  } catch {
    return null
  }
}

import apiClient from '@/api/axios'
import { fetchAdminCoursesPage } from '@/api/superAdminCatalogApi'
import { fetchPublicWorkshopsPage } from '@/api/workshopsApi.public'
import { fetchAdminLearningPaths } from '@/api/learningPathsApi'
import { extractCoursesList } from '@/api/coursesApi.public'
import type { SearchablePurchasable } from './manualPaymentFormTypes'

const silent = { skipErrorToast: true } as Record<string, unknown>

function toNum(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function mapCourse(row: Record<string, unknown>): SearchablePurchasable | null {
  const id = Number(row.id)
  if (!id) return null
  const title = String(row.title ?? row.name ?? '').trim()
  if (!title) return null
  return {
    id,
    type: 'course',
    title,
    slug: (row.slug as string) ?? null,
    price: toNum(row.price ?? row.discount_price),
    status: (row.status as string) ?? null,
    subtitle: (row.instructor_name as string) ?? null,
  }
}

async function searchCourses(q: string): Promise<SearchablePurchasable[]> {
  // Primary: finance-accessible endpoint (works for finance_manager + admin roles)
  try {
    const res = await apiClient.get<unknown>('/finance/purchasables', {
      ...silent,
      params: { q: q.trim() || undefined, per_page: 30 },
    })
    const body = res.data as Record<string, unknown>
    if (Array.isArray(body.data)) {
      return (body.data as Record<string, unknown>[])
        .map(mapCourse)
        .filter((x): x is SearchablePurchasable => x != null)
    }
  } catch {
    // fall through to admin endpoint
  }

  // Fallback: try admin courses page (works for admin/super_admin/tech_admin)
  const params: Record<string, unknown> = { per_page: 30, page: 1 }
  if (q.trim()) params.search = q.trim()
  else params.status = 'published'

  const page = await fetchAdminCoursesPage(params)
  if (page?.rows?.length) {
    return page.rows
      .map((c) => mapCourse(c as unknown as Record<string, unknown>))
      .filter((x): x is SearchablePurchasable => x != null)
  }

  // Last resort: public courses list
  try {
    const res = await apiClient.get<unknown>('/courses', { ...silent, params: { per_page: 50, search: q.trim() || undefined } })
    const list = extractCoursesList(res.data)
    return list
      .map((c) => mapCourse(c as unknown as Record<string, unknown>))
      .filter((x): x is SearchablePurchasable => x != null)
  } catch {
    return []
  }
}

export async function searchPurchasablesForManualPayment(q: string): Promise<SearchablePurchasable[]> {
  const query = q.trim()
  const [courses, workshopsRes, pathsRes] = await Promise.all([
    searchCourses(query),
    fetchPublicWorkshopsPage({ search: query || undefined, per_page: 20 }),
    fetchAdminLearningPaths({ search: query || undefined, per_page: 20, status: query ? undefined : 'published' }),
  ])

  const workshops: SearchablePurchasable[] = workshopsRes.workshops.map((w) => ({
    id: w.id,
    type: 'workshop' as const,
    title: w.title,
    slug: w.slug,
    price: w.price,
    status: w.status,
    subtitle: w.instructor_name,
  }))

  const paths: SearchablePurchasable[] = pathsRes.data.map((lp) => ({
    id: lp.id,
    type: 'learning_path' as const,
    title: lp.title,
    slug: lp.slug,
    price: lp.discount_price ?? lp.price,
    status: lp.status,
    subtitle: null,
  }))

  return [...courses, ...workshops, ...paths]
}

export function groupPurchasables(items: SearchablePurchasable[]): Record<string, SearchablePurchasable[]> {
  const groups: Record<string, SearchablePurchasable[]> = {
    course: [],
    workshop: [],
    learning_path: [],
  }
  for (const item of items) {
    groups[item.type]?.push(item)
  }
  return groups
}

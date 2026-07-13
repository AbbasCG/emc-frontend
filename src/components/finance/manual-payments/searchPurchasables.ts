import apiClient from '@/api/axios'
import type { SearchablePurchasable } from './manualPaymentFormTypes'

const silent = { skipErrorToast: true } as Record<string, unknown>

function toSearchable(row: Record<string, unknown>): SearchablePurchasable | null {
  const id = Number(row.id)
  if (!id) return null
  const title = String(row.title ?? row.name ?? '').trim()
  if (!title) return null
  const type = String(row.type ?? 'course') as SearchablePurchasable['type']
  return {
    id,
    type,
    title,
    slug: (row.slug as string) ?? null,
    price: Number.isFinite(Number(row.price)) ? Number(row.price) : null,
    status: (row.status as string) ?? null,
    subtitle: (row.subtitle ?? row.instructor_name ?? null) as string | null,
  }
}

/**
 * Load paid courses and workshops for the Manual Payment relation step.
 * Uses the finance-accessible /finance/purchasables endpoint which allows
 * finance_manager, admin, super_admin, and tech_admin roles.
 * Passes student_id so the backend can annotate enrollment status.
 */
export async function searchPurchasablesForManualPayment(
  q: string,
  studentId?: number | null,
): Promise<SearchablePurchasable[]> {
  try {
    const res = await apiClient.get<unknown>('/finance/purchasables', {
      ...silent,
      params: {
        q: q.trim() || undefined,
        student_id: studentId || undefined,
        type: 'all',
        per_page: 50,
      },
    })
    const body = res.data as Record<string, unknown>
    if (Array.isArray(body.data)) {
      return (body.data as Record<string, unknown>[])
        .map(toSearchable)
        .filter((x): x is SearchablePurchasable => x != null)
    }
  } catch {
    // endpoint unavailable — return empty rather than crashing
  }
  return []
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

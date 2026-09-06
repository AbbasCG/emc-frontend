import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import type { GlobalSearchResponse } from '@/types/platform'
import { semanticSearch } from './aiSearchApi'

export async function globalSearch(q: string): Promise<GlobalSearchResponse> {
  try {
    const semantic = await semanticSearch(q)
    if (semantic.groups.length) {
      return {
        query: semantic.query,
        groups: semantic.groups.map((g) => ({
          type: g.scope,
          label: g.label,
          items: g.items.map((item) => ({
            id: item.id,
            title: item.title,
            href: item.href,
            subtitle: item.subtitle,
          })),
        })),
      }
    }
    const res = await apiClient.get<unknown>('/search', { params: { q } })
    return unwrapLms<GlobalSearchResponse>(res.data)
  } catch {
    return { query: q, groups: [] }
  }
}

import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { KnowledgeArticle, KnowledgeCategory } from '@/types/platform'

export async function fetchKnowledgeCategories(): Promise<KnowledgeCategory[]> {
  try {
    const res = await apiClient.get<unknown>('/knowledge/categories')
    return asList<KnowledgeCategory>(res.data)
  } catch {
    return []
  }
}

export async function fetchKnowledgeArticles(params?: {
  category?: string
  q?: string
}): Promise<KnowledgeArticle[]> {
  try {
    const res = await apiClient.get<unknown>('/knowledge/articles', { params })
    return asList<KnowledgeArticle>(res.data)
  } catch {
    return []
  }
}

export async function fetchKnowledgeArticleBySlug(slug: string): Promise<KnowledgeArticle> {
  const res = await apiClient.get<unknown>(`/knowledge/articles/${encodeURIComponent(slug)}`)
  return unwrapLms<KnowledgeArticle>(res.data)
}

export async function fetchKnowledgeArticleById(id: number): Promise<KnowledgeArticle> {
  const res = await apiClient.get<unknown>(`/admin/knowledge/articles/${id}`)
  return unwrapLms<KnowledgeArticle>(res.data)
}

export async function createKnowledgeArticle(body: Partial<KnowledgeArticle>): Promise<KnowledgeArticle> {
  const res = await apiClient.post<unknown>('/admin/knowledge/articles', body)
  return unwrapLms<KnowledgeArticle>(res.data)
}

export async function updateKnowledgeArticle(
  id: number,
  body: Partial<KnowledgeArticle>,
): Promise<KnowledgeArticle> {
  const res = await apiClient.patch<unknown>(`/admin/knowledge/articles/${id}`, body)
  return unwrapLms<KnowledgeArticle>(res.data)
}

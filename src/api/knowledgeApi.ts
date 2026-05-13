import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import {
  seedKnowledgeArticles,
  seedKnowledgeCategories,
} from '@/data/platformSeed'
import type { KnowledgeArticle, KnowledgeCategory } from '@/types/platform'

export async function fetchKnowledgeCategories(): Promise<KnowledgeCategory[]> {
  try {
    const res = await apiClient.get<unknown>('/knowledge/categories')
    return asList<KnowledgeCategory>(res.data)
  } catch {
    return seedKnowledgeCategories()
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
    let list = seedKnowledgeArticles()
    if (params?.category) {
      const cats = seedKnowledgeCategories()
      const cat = cats.find((c) => c.slug === params.category || c.id === params.category)
      list = list.filter((a) => a.category_id === (cat?.id ?? params.category))
    }
    if (params?.q?.trim()) {
      const qq = params.q.toLowerCase()
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(qq) ||
          (a.excerpt ?? '').toLowerCase().includes(qq),
      )
    }
    return list
  }
}

export async function fetchKnowledgeArticleBySlug(slug: string): Promise<KnowledgeArticle> {
  try {
    const res = await apiClient.get<unknown>(`/knowledge/articles/${encodeURIComponent(slug)}`)
    return unwrapLms<KnowledgeArticle>(res.data)
  } catch {
    const found = seedKnowledgeArticles().find((a) => a.slug === slug)
    if (!found) throw new Error('المقال غير موجود')
    return found
  }
}

export async function fetchKnowledgeArticleById(id: number): Promise<KnowledgeArticle> {
  try {
    const res = await apiClient.get<unknown>(`/admin/knowledge/articles/${id}`)
    return unwrapLms<KnowledgeArticle>(res.data)
  } catch {
    const found = seedKnowledgeArticles().find((a) => a.id === id)
    if (!found) throw new Error('المقال غير موجود')
    return found
  }
}

export async function createKnowledgeArticle(body: Partial<KnowledgeArticle>): Promise<KnowledgeArticle> {
  try {
    const res = await apiClient.post<unknown>('/admin/knowledge/articles', body)
    return unwrapLms<KnowledgeArticle>(res.data)
  } catch {
    return {
      id: Date.now(),
      slug: body.slug ?? 'draft',
      title: body.title ?? 'مسودة بلا عنوان',
      excerpt: body.excerpt ?? '',
      body: body.body ?? '',
      category_id: body.category_id ?? 'guides',
      tags: body.tags ?? [],
      visibility: body.visibility ?? 'internal',
      status: body.status ?? 'draft',
      updated_at: new Date().toISOString().slice(0, 10),
    }
  }
}

export async function updateKnowledgeArticle(
  id: number,
  body: Partial<KnowledgeArticle>,
): Promise<KnowledgeArticle> {
  try {
    const res = await apiClient.patch<unknown>(`/admin/knowledge/articles/${id}`, body)
    return unwrapLms<KnowledgeArticle>(res.data)
  } catch {
    const prev = seedKnowledgeArticles().find((a) => a.id === id)
    return {
      ...(prev ?? seedKnowledgeArticles()[0]!),
      ...body,
      id,
      updated_at: new Date().toISOString().slice(0, 10),
    }
  }
}

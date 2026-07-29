import http from './axios'

export interface ChartOfAccountItem {
  id: number
  code: string
  name_ar: string
  name_en?: string | null
  type: 'debit' | 'credit'
  parent_id?: number | null
  is_selectable: boolean
  created_at?: string
  updated_at?: string
  parent?: ChartOfAccountItem | null
  children?: ChartOfAccountItem[]
  all_children?: ChartOfAccountItem[]
}

export interface CodeSuggestionResponse {
  success: boolean
  suggested_code: string
  type: 'debit' | 'credit'
  parent_name?: string
}

export async function fetchChartOfAccountsTree(): Promise<ChartOfAccountItem[]> {
  const { data } = await http.get<{ success: boolean; data: ChartOfAccountItem[] }>(
    '/admin/finance/chart-of-accounts'
  )
  return data.data
}

export async function fetchAccountsList(params?: {
  search?: string
  type?: 'debit' | 'credit'
  selectable_only?: boolean
}): Promise<ChartOfAccountItem[]> {
  const { data } = await http.get<{ success: boolean; data: ChartOfAccountItem[] }>(
    '/admin/finance/accounts',
    { params }
  )
  return data.data
}

export async function suggestAccountCode(parentId?: number): Promise<CodeSuggestionResponse> {
  const { data } = await http.get<CodeSuggestionResponse>(
    '/admin/finance/chart-of-accounts/suggest-code',
    { params: { parent_id: parentId } }
  )
  return data
}

export async function createChartOfAccount(payload: {
  code: string
  name_ar: string
  name_en?: string
  type?: 'debit' | 'credit'
  parent_id?: number | null
  is_selectable?: boolean
}): Promise<ChartOfAccountItem> {
  const { data } = await http.post<{ success: boolean; data: ChartOfAccountItem }>(
    '/admin/finance/accounts',
    payload
  )
  return data.data
}

export async function updateChartOfAccount(
  id: number,
  payload: {
    name_ar: string
    name_en?: string
    is_selectable: boolean
  }
): Promise<ChartOfAccountItem> {
  const { data } = await http.put<{ success: boolean; data: ChartOfAccountItem }>(
    `/admin/finance/accounts/${id}`,
    payload
  )
  return data.data
}

export async function deleteChartOfAccount(id: number): Promise<{ success: boolean; message: string }> {
  const { data } = await http.delete<{ success: boolean; message: string }>(
    `/admin/finance/accounts/${id}`
  )
  return data
}

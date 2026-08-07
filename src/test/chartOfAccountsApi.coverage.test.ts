import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchChartOfAccountsTree,
  fetchAccountsList,
  suggestAccountCode,
  createChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount,
  type ChartOfAccountItem,
  type CodeSuggestionResponse,
} from '@/api/chartOfAccountsApi'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

const leaf: ChartOfAccountItem = {
  id: 12,
  code: '1101',
  name_ar: 'النقدية بالصندوق',
  name_en: 'Cash on hand',
  type: 'debit',
  parent_id: 11,
  is_selectable: true,
  is_system: false,
  is_deletable: true,
}

const root: ChartOfAccountItem = {
  id: 11,
  code: '11',
  name_ar: 'الأصول المتداولة',
  type: 'debit',
  parent_id: null,
  is_selectable: false,
  children: [leaf],
}

describe('reads', () => {
  it('fetchChartOfAccountsTree returns the tree from the { success, data } envelope', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: [root] } })
    await expect(fetchChartOfAccountsTree()).resolves.toEqual([root])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/finance/chart-of-accounts')
  })

  it('fetchAccountsList forwards search/type/selectable_only params', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: [leaf] } })
    const params = { search: 'نقدية', type: 'debit' as const, selectable_only: true }
    await expect(fetchAccountsList(params)).resolves.toEqual([leaf])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/finance/accounts', { params })
  })

  it('fetchAccountsList works without params', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: [] } })
    await expect(fetchAccountsList()).resolves.toEqual([])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/finance/accounts', { params: undefined })
  })

  it('suggestAccountCode returns the raw suggestion payload (no data unwrap)', async () => {
    const suggestion: CodeSuggestionResponse = {
      success: true,
      suggested_code: '1102',
      type: 'debit',
      parent_name: 'الأصول المتداولة',
    }
    mockedApi.get.mockResolvedValueOnce({ data: suggestion })
    await expect(suggestAccountCode(11)).resolves.toEqual(suggestion)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/finance/chart-of-accounts/suggest-code', {
      params: { parent_id: 11 },
    })
  })

  it('suggestAccountCode without a parent sends parent_id: undefined (root-level suggestion)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, suggested_code: '2', type: 'credit' },
    })
    await suggestAccountCode()
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/finance/chart-of-accounts/suggest-code', {
      params: { parent_id: undefined },
    })
  })

  it('read errors propagate', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('500'))
    await expect(fetchChartOfAccountsTree()).rejects.toThrow('500')
  })
})

describe('mutations', () => {
  it('createChartOfAccount POSTs the payload and unwraps the created account', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, data: leaf } })
    const payload = {
      code: '1101',
      name_ar: 'النقدية بالصندوق',
      type: 'debit' as const,
      parent_id: 11,
      is_selectable: true,
    }
    await expect(createChartOfAccount(payload)).resolves.toEqual(leaf)
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/finance/accounts', payload)
  })

  it('updateChartOfAccount PUTs to /admin/finance/accounts/{id}', async () => {
    const updated = { ...leaf, name_ar: 'الخزينة الرئيسية' }
    mockedApi.put.mockResolvedValueOnce({ data: { success: true, data: updated } })
    const payload = { name_ar: 'الخزينة الرئيسية', is_selectable: true }
    await expect(updateChartOfAccount(12, payload)).resolves.toEqual(updated)
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/finance/accounts/12', payload)
  })

  it('deleteChartOfAccount returns the { success, message } body verbatim', async () => {
    mockedApi.delete.mockResolvedValueOnce({
      data: { success: true, message: 'تم حذف الحساب بنجاح' },
    })
    await expect(deleteChartOfAccount(12)).resolves.toEqual({
      success: true,
      message: 'تم حذف الحساب بنجاح',
    })
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/finance/accounts/12')
  })

  it('mutation errors propagate (protected/system accounts)', async () => {
    mockedApi.delete.mockRejectedValueOnce(new Error('422'))
    await expect(deleteChartOfAccount(1)).rejects.toThrow('422')
  })
})

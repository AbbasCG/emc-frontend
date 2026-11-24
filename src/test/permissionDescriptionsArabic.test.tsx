import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock('@/api/axios', () => ({ default: { get: api.get, put: api.put, post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))

import { fetchAdminPermissionsCatalog } from '@/api/rolesPermissionsApi'
import { RolePermissionsMatrix } from '@/components/super-admin/RolePermissionsMatrix'
import { permissionActionLabelAr, permissionDescriptionAr } from '@/utils/permissionLabels'

/** The catalog exactly as the server sends it: English `label` / `description` NEXT TO `label_ar` / `description_ar`. */
const serverCatalog = {
  success: true,
  data: {
    groups: [
      {
        key: 'tickets',
        label: 'التذاكر',
        permissions: [
          {
            key: 'tickets.review_completion',
            label: 'Review and approve ticket completion',
            label_ar: 'مراجعة واعتماد إنجاز التذاكر',
            description: 'Approve completion, approve for deployment and return for rework on tickets of the departments the holder leads.',
            description_ar: 'اعتماد إنجاز التذاكر أو اعتمادها للنشر أو إعادتها للتنفيذ ضمن الإدارات التي يقودها حاملها.',
          },
          {
            key: 'tickets.review_participated',
            label: 'Approve tickets I take part in',
            label_ar: 'اعتماد التذاكر التي أشارك فيها',
            description: 'Review a ticket the holder created, is assigned to, or submitted the completion of.',
            description_ar: 'تتيح اعتماد تذكرة أنشأها صاحبها أو أُسندت إليه أو أرسل إنجازها للمراجعة.',
          },
        ],
      },
    ],
  },
}

beforeEach(() => {
  api.get.mockReset()
  api.get.mockImplementation(async (url: string) => (String(url).includes('/roles/') ? { data: { data: { permissions: [] } } } : { data: serverCatalog }))
})

describe('the Arabic text of a permission wins over the English one', () => {
  it('the catalog normalizer takes label_ar / description_ar before label / description', async () => {
    const cat = await fetchAdminPermissionsCatalog()
    const [review, participated] = cat.groups[0].permissions

    expect(review.label).toBe('مراجعة واعتماد إنجاز التذاكر')
    expect(review.description).toContain('اعتماد إنجاز التذاكر')
    expect(participated.description).toContain('أرسل إنجازها للمراجعة')
    expect(`${review.description}${participated.description}`).not.toMatch(/Approve|Review/)
  })

  it('the helpers prefer Arabic backend text, then the Arabic map, and English only as the last resort', () => {
    expect(permissionDescriptionAr('tickets.review_participated', 'نص عربي من الخادم')).toBe('نص عربي من الخادم')
    // An English description from the server never hides the frontend's Arabic text for a key that has one.
    expect(permissionDescriptionAr('tickets.review_participated', 'Review a ticket the holder created')).toContain('أرسل إنجازها للمراجعة')
    expect(permissionActionLabelAr('tickets.review_completion', 'Review and approve ticket completion')).toBe('مراجعة واعتماد إنجاز التذاكر')
    // No Arabic anywhere for an unknown key: the English text beats a blank.
    expect(permissionDescriptionAr('custom.thing', 'Only English here')).toBe('Only English here')
    expect(permissionDescriptionAr('custom.thing')).toBe('')
  })

  it('the role editor shows the Arabic descriptions of both ticket permissions, never the English ones', async () => {
    render(<RolePermissionsMatrix roleSlug="department_manager" canEdit />)

    expect(await screen.findByText(/اعتماد إنجاز التذاكر أو اعتمادها للنشر/)).toBeInTheDocument()
    expect(screen.getByText(/تتيح اعتماد تذكرة أنشأها صاحبها/)).toBeInTheDocument()
    expect(screen.queryByText(/Approve completion/)).toBeNull()
    expect(screen.queryByText(/Review a ticket the holder/)).toBeNull()
    expect(screen.getByText('مراجعة واعتماد إنجاز التذاكر')).toBeInTheDocument()
  })
})

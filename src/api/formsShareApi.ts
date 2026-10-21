import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import { OWN_ERRORS } from './formsApi'
import type { FormAccessMode } from '@/types/operations'

/**
 * Forms Phase 3 client: how a form is shared. Links, the access mode and invitations.
 *
 * A link's token comes back ONCE, from `createShareLink`; nothing else can return it (the server keeps only a hash). Every call
 * turns the global error toast off and lets the failure propagate; `parseFormActionError` (formsAdminApi) turns one into words.
 */

type RawRecord = Record<string, unknown>

export type ShareLinkStatus = 'active' | 'expired' | 'revoked' | 'exhausted'

export type PersonRef = { id: number; name: string }

export type ShareLinkRow = {
  id: number
  label: string
  /** The last characters of the token: enough to tell two links apart, not enough to use one. */
  token_hint: string
  status: ShareLinkStatus
  /** Submissions made through the link: the number `max_uses` limits. Opening it uses nothing. */
  uses: number
  max_uses: number | null
  expires_at: string | null
  created_at: string | null
  created_by: PersonRef | null
  revoked_at: string | null
  revoked_by: PersonRef | null
}

export type CreatedShareLink = ShareLinkRow & { token: string; path: string }

export type InvitationRow = {
  id: number
  user: PersonRef | null
  invited_by: PersonRef | null
  created_at: string | null
  revoked_at: string | null
  revoked_by: PersonRef | null
}

/** What a stranger can do with the form's public address right now, from the server's own rules. */
export type PublicStatus = {
  state: string
  reachable: boolean
  accepting: boolean
  message: string
}

export type SharingData = {
  form: { id: number; slug: string; status: string; public_path: string }
  access: { mode: FormAccessMode; requires_share_link: boolean }
  public: PublicStatus
  links: ShareLinkRow[]
  invitations: InvitationRow[]
  abilities: { manage: boolean }
}

const base = (id: number) => `/operations/forms/${id}`

export async function fetchSharing(id: number): Promise<SharingData> {
  const res = await apiClient.get<unknown>(`${base(id)}/sharing`, OWN_ERRORS)
  return unwrapLms<SharingData>(res.data)
}

export async function updateSharingAccess(id: number, body: { access_mode: FormAccessMode; requires_share_link: boolean }): Promise<SharingData> {
  const res = await apiClient.put<unknown>(`${base(id)}/sharing`, body, OWN_ERRORS)
  return unwrapLms<SharingData>(res.data)
}

export type NewShareLink = { label: string; expires_at?: string | null; max_uses?: number | null }

export async function createShareLink(id: number, body: NewShareLink): Promise<CreatedShareLink> {
  const res = await apiClient.post<unknown>(`${base(id)}/share-links`, body, OWN_ERRORS)
  return unwrapLms<CreatedShareLink>(res.data)
}

export async function revokeShareLink(id: number, linkId: number): Promise<ShareLinkRow> {
  const res = await apiClient.post<unknown>(`${base(id)}/share-links/${linkId}/revoke`, {}, OWN_ERRORS)
  return unwrapLms<ShareLinkRow>(res.data)
}

export async function searchInvitees(id: number, query: string): Promise<PersonRef[]> {
  const res = await apiClient.get<unknown>(`${base(id)}/invitation-candidates`, { params: { q: query }, ...OWN_ERRORS })
  const data = unwrapLms<RawRecord[] | { data?: RawRecord[] }>(res.data)
  return (Array.isArray(data) ? data : (data.data ?? [])) as unknown as PersonRef[]
}

export async function inviteUser(id: number, userId: number): Promise<InvitationRow> {
  const res = await apiClient.post<unknown>(`${base(id)}/invitations`, { user_id: userId }, OWN_ERRORS)
  return unwrapLms<InvitationRow>(res.data)
}

export async function revokeInvitation(id: number, invitationId: number): Promise<InvitationRow> {
  const res = await apiClient.post<unknown>(`${base(id)}/invitations/${invitationId}/revoke`, {}, OWN_ERRORS)
  return unwrapLms<InvitationRow>(res.data)
}

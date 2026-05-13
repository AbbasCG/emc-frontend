import apiClient from './axios'
import { asList } from './lmsApi'
import { seedAuditLogs } from '@/data/platformSeed'
import type { AuditLogEntry } from '@/types/platform'

export async function fetchAuditLogs(params?: {
  action?: string
  entity?: string
  from?: string
  to?: string
}): Promise<AuditLogEntry[]> {
  try {
    const res = await apiClient.get<unknown>('/audit-logs', { params })
    return asList<AuditLogEntry>(res.data)
  } catch {
    return seedAuditLogs()
  }
}

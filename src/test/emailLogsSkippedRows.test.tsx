import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import EmailLogsPage from '@/pages/super-admin/EmailLogsPage'
import type { EmailLog } from '@/api/emailAdminApi'

/**
 * Email Logs: the backend hides "skipped" rows (deliberately not sent) unless their status is
 * asked for. The page says how many are hidden, lets the admin show them from the status filter,
 * and names the email types that used to be missing from the log.
 */

const api = vi.hoisted(() => ({
  fetchEmailLogs: vi.fn(),
  fetchEmailLogStats: vi.fn(),
  fetchEmailLog: vi.fn(),
  fetchEmailLogChart: vi.fn(),
  fetchEmailQueueStats: vi.fn(),
  retryEmailLog: vi.fn(),
}))
vi.mock('@/api/emailAdminApi', async (orig) => ({ ...(await orig<object>()), ...api }))

function log(over: Partial<EmailLog>): EmailLog {
  return {
    id: 1, uuid: null, user_id: 1, recipient: 'me@example.com', recipient_name: 'عباس', type: 'operations_ticket_assigned',
    subject: 'أُسندت إليك تذكرة', status: 'sent', error_message: null, mail_driver: 'smtp', job_id: null, retry_count: 0,
    execution_time_ms: 120, delivery_time_ms: null, queued_at: null, sent_at: '2026-11-22T10:00:00Z', failed_at: null,
    delivered_at: null, created_at: '2026-11-22T10:00:00Z', ...over,
  }
}

const page = (data: EmailLog[]) => ({ data, meta: { total: data.length, current_page: 1, last_page: 1, per_page: 25 } })

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset())
  api.fetchEmailLogStats.mockResolvedValue({ total: 3, total_sent: 1, sent_today: 1, failed_today: 1, pending: 1, failed: 1, success_rate: 33.3, avg_delivery_ms: 120, skipped: 7 })
  api.fetchEmailLogChart.mockResolvedValue([])
  api.fetchEmailQueueStats.mockResolvedValue({ pending_logs: 1, failed_logs: 1, retrying: 0, queue_jobs: 0, failed_jobs: 0 })
  api.fetchEmailLogs.mockImplementation(async (params: { status?: string }) =>
    params?.status === 'skipped_disabled'
      ? page([log({ id: 9, status: 'skipped_disabled', recipient: 'skip@example.com' })])
      : page([
          log({ id: 1 }),
          log({ id: 2, status: 'failed', recipient: 'failed@example.com', error_message: 'SMTP 550' }),
          log({ id: 3, status: 'pending', type: 'volunteer_accepted', recipient: 'vol@example.com' }),
        ]))
})

describe('EmailLogsPage — skipped rows', () => {
  it('asks the backend without a status by default, keeps failures and says how many skipped rows are hidden', async () => {
    render(<EmailLogsPage />)

    expect(await screen.findByText('failed@example.com')).toBeInTheDocument()
    expect(api.fetchEmailLogs).toHaveBeenCalledWith(expect.objectContaining({ status: undefined }))
    expect(screen.queryByText('skip@example.com')).toBeNull()
    expect(screen.getByTestId('skipped-hidden-hint')).toHaveTextContent('أُخفيت 7 رسالة متخطّاة')
    // A type that used to be missing from the log now has its Arabic name.
    expect(screen.getByText('قبول متطوع (بيانات الدخول)')).toBeInTheDocument()
  })

  it('shows skipped rows when their status is chosen, and drops the hint', async () => {
    render(<EmailLogsPage />)
    await screen.findByText('failed@example.com')

    fireEvent.click(screen.getByRole('button', { name: /تم التخطي \(معطّل من الإعدادات\)/ }))

    expect(await screen.findByText('skip@example.com')).toBeInTheDocument()
    await waitFor(() => expect(api.fetchEmailLogs).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'skipped_disabled' })))
    expect(screen.queryByTestId('skipped-hidden-hint')).toBeNull()
  })
})

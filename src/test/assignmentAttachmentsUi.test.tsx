import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AssignmentAttachmentList from '@/components/lms/AssignmentAttachmentList'
import AssignmentCard from '@/components/lms/AssignmentCard'
import SubmissionReviewPanel from '@/components/lms/SubmissionReviewPanel'
import { fetchSubmissionDetail } from '@/api/instructorApi'
import apiClient from '@/api/axios'
import type { AssignmentAttachment, StudentAssignment, SubmissionDetail } from '@/types/lms'

const downloadMock = vi.fn()
const toastError = vi.fn()

vi.mock('@/api/assignmentAttachmentsApi', () => ({
  downloadAssignmentAttachment: (a: AssignmentAttachment) => downloadMock(a),
}))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: (m: string) => toastError(m), warning: vi.fn(), info: vi.fn() },
}))

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), defaults: { baseURL: 'http://localhost/api' } },
}))

const FILES: AssignmentAttachment[] = [
  { id: 1, name: 'تقرير المشروع النهائي.pdf', size: 350 * 1024, mime: 'application/pdf', download_url: '/dl/1' },
  { id: 2, name: 'screenshot.png', size: 2.5 * 1024 * 1024, mime: 'image/png', download_url: '/dl/2' },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AssignmentAttachmentList', () => {
  it('renders nothing for an empty list', () => {
    const { container } = render(<AssignmentAttachmentList attachments={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lists names (Arabic and Latin), sizes and a download button each', () => {
    render(<AssignmentAttachmentList attachments={FILES} />)
    const first = screen.getByText('تقرير المشروع النهائي.pdf')
    expect(first).toHaveAttribute('title', 'تقرير المشروع النهائي.pdf')
    expect(first).toHaveAttribute('dir', 'auto')
    expect(screen.getByText('350 كيلوبايت')).toBeInTheDocument()
    expect(screen.getByText('2.5 ميجابايت')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تنزيل تقرير المشروع النهائي.pdf' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تنزيل screenshot.png' })).toBeInTheDocument()
  })

  it("renders the legacy single-file entry (id 'legacy', size null) with its name and downloads it", async () => {
    const legacy: AssignmentAttachment = { id: 'legacy', name: 'واجبي القديم.docx', size: null, mime: 'application/msword', download_url: '/api/submissions/9/download' }
    downloadMock.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    const { container } = render(<AssignmentAttachmentList attachments={[legacy, FILES[0]]} />)

    expect(screen.getByText('واجبي القديم.docx')).toBeInTheDocument()
    const items = container.querySelectorAll('li')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).not.toMatch(/كيلوبايت|ميجابايت|بايت/)
    await user.click(screen.getByRole('button', { name: 'تنزيل واجبي القديم.docx' }))
    expect(downloadMock).toHaveBeenCalledWith(legacy)
  })

  it('downloads through the authorized helper and locks the other buttons meanwhile', async () => {
    let finish: () => void = () => {}
    downloadMock.mockImplementationOnce(() => new Promise<void>((r) => (finish = r)))
    const user = userEvent.setup()
    render(<AssignmentAttachmentList attachments={FILES} />)

    await user.click(screen.getByRole('button', { name: 'تنزيل screenshot.png' }))
    expect(downloadMock).toHaveBeenCalledWith(FILES[1])
    expect(screen.getByRole('button', { name: 'تنزيل تقرير المشروع النهائي.pdf' })).toBeDisabled()

    finish()
    await waitFor(() => expect(screen.getByRole('button', { name: 'تنزيل screenshot.png' })).toBeEnabled())
  })

  it('tells the student in Arabic when a download fails', async () => {
    downloadMock.mockRejectedValueOnce(new Error('403'))
    const user = userEvent.setup()
    render(<AssignmentAttachmentList attachments={FILES} />)
    await user.click(screen.getByRole('button', { name: 'تنزيل screenshot.png' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('تعذّر تنزيل الملف. حاول مرة أخرى.'))
  })
})

describe('AssignmentCard — submitted files', () => {
  const base: StudentAssignment = { id: 1, assignment_id: 9, title: 'واجب', status: 'submitted', submitted_at: '2026-11-01T10:00:00Z' }

  it('shows the submitted files on a submitted assignment', () => {
    render(<AssignmentCard assignment={{ ...base, attachments: FILES }} />)
    expect(screen.getByText('ملفاتك المُسلَّمة')).toBeInTheDocument()
    expect(screen.getByText('screenshot.png')).toBeInTheDocument()
  })

  it('renders exactly as before when there are no attachments', () => {
    render(<AssignmentCard assignment={base} />)
    expect(screen.queryByText('ملفاتك المُسلَّمة')).not.toBeInTheDocument()
  })

  it('does not show files on an assignment that is still open for submission', () => {
    render(<AssignmentCard assignment={{ ...base, status: 'pending', attachments: FILES }} onSubmit={() => {}} />)
    expect(screen.queryByText('screenshot.png')).not.toBeInTheDocument()
  })
})

describe('SubmissionReviewPanel — instructor side', () => {
  const detail: SubmissionDetail = {
    id: 5,
    student_id: 3,
    student_name: 'طالب',
    status: 'pending_review',
    body_text: 'الإجابة',
    assignment_title: 'واجب',
    max_score: 100,
    file_url: null,
  }

  function renderPanel(submission: SubmissionDetail) {
    return render(<SubmissionReviewPanel submission={submission} onSubmit={async () => {}} onClose={() => {}} />)
  }

  it('lists every attachment with a download button', () => {
    renderPanel({ ...detail, attachments: FILES })
    expect(screen.getByText('تقرير المشروع النهائي.pdf')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^تنزيل / })).toHaveLength(2)
    expect(screen.queryByText('معاينة الملف')).not.toBeInTheDocument()
  })

  it('keeps the legacy single file (preview + download) when there are no attachments', () => {
    renderPanel({ ...detail, file_url: 'https://x/api/instructor/submissions/5/file' })
    expect(screen.getByText('معاينة الملف')).toBeInTheDocument()
    expect(screen.getByText('تنزيل الملف')).toBeInTheDocument()
  })

  it('says «غير متوفر» when the submission has no file at all', () => {
    renderPanel(detail)
    expect(screen.getByText('الملف المرفق')).toBeInTheDocument()
    expect(screen.queryByText('معاينة الملف')).not.toBeInTheDocument()
  })

  it('fetchSubmissionDetail carries attachments through the normalizer', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        data: {
          id: 5,
          student: { id: 3, name: 'طالب' },
          status: 'pending_review',
          attachments: [{ id: 1, name: 'a.pdf', size: 10, mime: 'application/pdf', download_url: '/dl/1' }, { id: 2 }],
        },
      },
    })
    const d = await fetchSubmissionDetail(5)
    expect(d.attachments).toEqual([{ id: 1, name: 'a.pdf', size: 10, mime: 'application/pdf', download_url: '/dl/1' }])
  })
})

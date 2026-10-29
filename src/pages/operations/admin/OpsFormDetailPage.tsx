import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import FormBuilderEditor from '@/components/operations/formBuilder/FormBuilderEditor'
import type { SaveStatus } from '@/components/operations/formBuilder/useDraftAutosave'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import FormResponsesPanel from '@/components/operations/formResponses/FormResponsesPanel'
import FormAnalyticsPanel from '@/components/operations/formAnalytics/FormAnalyticsPanel'
import FormAutomationPanel from '@/components/operations/formAutomation/FormAutomationPanel'
import FormActivityPanel from '@/components/operations/formAdmin/FormActivityPanel'
import FormCollaboratorsPanel from '@/components/operations/formAdmin/FormCollaboratorsPanel'
import FormPreviewModal from '@/components/operations/formAdmin/FormPreviewModal'
import FormPublishingPanel from '@/components/operations/formAdmin/FormPublishingPanel'
import FormSharePanel from '@/components/operations/formAdmin/FormSharePanel'
import FormStatusHeader from '@/components/operations/formAdmin/FormStatusHeader'
import FormVersionsPanel from '@/components/operations/formAdmin/FormVersionsPanel'
import FormTemplateActions from '@/components/operations/formTemplates/FormTemplateActions'
import { fetchFormDefinition } from '@/api/formsApi'
import type { OpsFormDefinition } from '@/types/operations'

const LOAD_ERROR = 'تعذّر تحميل النموذج. تحقق من الاتصال وأعد المحاولة.'

/** Says what actually went wrong: a form that is not yours or is gone is not a connection problem. */
function loadMessage(error: unknown): string {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined
  if (status === 403) return 'لا تملك صلاحية عرض هذا النموذج.'
  if (status === 404) return 'النموذج غير موجود أو حُذف.'
  return LOAD_ERROR
}

type TabKey = 'builder' | 'responses' | 'analytics' | 'publishing' | 'automation' | 'sharing' | 'collaborators' | 'activity' | 'versions'

const TAB_LABELS: Record<TabKey, string> = {
  builder: 'المحرر',
  responses: 'الإرسالات',
  analytics: 'التحليلات',
  publishing: 'إعدادات النشر',
  automation: 'الإشعارات والأتمتة',
  sharing: 'المشاركة',
  collaborators: 'المتعاونون',
  activity: 'سجل النشاط',
  versions: 'الإصدارات',
}

/** Which tabs this person may open: the same facts the server enforces, used here only to hide what would be refused. */
function visibleTabs(form: OpsFormDefinition): TabKey[] {
  const a = form.abilities
  const tabs: TabKey[] = ['builder']
  if (a?.view_responses) tabs.push('responses', 'analytics')
  if (a?.edit || a?.manage_access) tabs.push('publishing')
  if (a?.edit) tabs.push('automation')
  if (a?.view_sharing) tabs.push('sharing')
  if (a?.edit) tabs.push('collaborators')
  tabs.push('activity', 'versions')

  return tabs
}

export default function OpsFormDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const fid = id ? Number(id) : NaN
  const [form, setForm] = useState<OpsFormDefinition | null>(null)
  const [tab, setTab] = useState<TabKey>('builder')
  const [builderKey, setBuilderKey] = useState(0)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [previewing, setPreviewing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Re-arm the loading state during render when the route id changes (react.dev
  // "adjusting state when a prop changes"), so the fetch effect below never has to
  // touch state synchronously.
  const [seenFid, setSeenFid] = useState(fid)
  if (!Object.is(seenFid, fid)) {
    setSeenFid(fid)
    setLoading(true)
    setLoadError(null)
  }

  useEffect(() => {
    if (!Number.isFinite(fid)) return
    let cancelled = false
    void (async () => {
      try {
        const f = await fetchFormDefinition(fid)
        if (cancelled) return
        setForm(f)
      } catch (e) {
        if (!cancelled) setLoadError(loadMessage(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [fid])

  // Retry lives outside the effect, so the synchronous reset here is legitimate.
  const retry = useCallback(async () => {
    if (!Number.isFinite(fid)) return
    setLoadError(null)
    setLoading(true)
    try {
      setForm(await fetchFormDefinition(fid))
    } catch (e) {
      setLoadError(loadMessage(e))
    } finally {
      setLoading(false)
    }
  }, [fid])

  if (!Number.isFinite(fid)) return <p className="text-center font-black text-deepBlue">معرف غير صالح</p>
  if (loading) return <OpsPageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void retry()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )
  if (!form) return <OpsPageSkeleton />

  const tabs = visibleTabs(form)
  const active: TabKey = tabs.includes(tab) ? tab : 'builder'
  const canEdit = form.abilities?.edit ?? false

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard/admin/forms"
        className="inline-flex items-center gap-1 text-xs font-black text-customBlue hover:text-customOrange"
      >
        <ChevronLeft size={14} />
        كل النماذج
      </Link>

      <FormStatusHeader form={form} onChanged={setForm} onPreview={() => setPreviewing(true)} unsaved={canEdit && saveStatus !== 'saved'} />

      <FormTemplateActions form={form} hasUnsavedEdits={canEdit && saveStatus !== 'saved'} />

      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{notice}</p>}

      <div role="tablist" aria-label="أقسام النموذج" className="flex flex-wrap justify-end gap-2 rounded-2xl bg-deepBlue/[0.03] p-2 ring-1 ring-deepBlue/[0.06]">
        {tabs.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`form-tab-${key}`}
            aria-selected={active === key}
            aria-controls={`form-panel-${key}`}
            onClick={() => { setTab(key); setNotice(null) }}
            className={`rounded-xl px-4 py-2 text-xs font-black ${active === key ? 'bg-deepBlue text-white' : 'bg-white text-deepBlue ring-1 ring-deepBlue/[0.08]'}`}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {/* The editor stays mounted while other tabs are open, so its undo history and unsaved edits survive a visit to them. */}
      <div role="tabpanel" id="form-panel-builder" aria-labelledby="form-tab-builder" hidden={active !== 'builder'}>
        {!canEdit && (
          <p role="note" className="mb-3 rounded-xl bg-slate-50 px-4 py-3 text-right text-xs font-bold text-slate-600">لا تملك صلاحية تعديل هذا النموذج. يمكنك الاطلاع عليه ومعاينته فقط.</p>
        )}
        <FormBuilderEditor
          key={builderKey}
          form={form}
          readOnly={!canEdit}
          // The page only ever holds what the server returned, never an optimistic copy of what it refused. Saving
          // changes the DRAFT; respondents see it only after it is published.
          onFormSaved={setForm}
          onStatusChange={setSaveStatus}
        />
      </div>

      <div role="tabpanel" id={`form-panel-${active}`} aria-labelledby={`form-tab-${active}`} hidden={active === 'builder'}>
        {active === 'responses' && <FormResponsesPanel formId={fid} />}
        {active === 'analytics' && <FormAnalyticsPanel formId={fid} />}
        {active === 'publishing' && (
          <FormPublishingPanel form={form} onChanged={setForm} onAccessRemoved={() => navigate('/dashboard/admin/forms')} />
        )}
        {active === 'automation' && <FormAutomationPanel formId={fid} />}
        {active === 'sharing' && <FormSharePanel form={form} />}
        {active === 'collaborators' && <FormCollaboratorsPanel form={form} />}
        {active === 'activity' && <FormActivityPanel formId={fid} />}
        {active === 'versions' && (
          <FormVersionsPanel
            form={form}
            onRestored={(next) => {
              setForm(next)
              setBuilderKey((k) => k + 1)
              setTab('builder')
              setNotice('استُعيد الإصدار إلى المسودة. راجع الأسئلة ثم انشرها كإصدار جديد عند الاستعداد.')
            }}
          />
        )}
      </div>

      <FormPreviewModal formId={fid} open={previewing} onClose={() => setPreviewing(false)} />
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText,
  CheckCircle2, Loader2, Check,
} from 'lucide-react'
import {
  fetchAmbassadorExportOptions, fetchAmbassadorExportPreview, downloadAmbassadorExport,
  type AmbassadorExportOptions, type AmbassadorExportFormat, type AmbassadorExportMode,
  type AmbassadorExportDateField, type AmbassadorExportPreview,
} from '@/api/ambassadorApplicationExportApi'
import { AMBASSADOR_STATUS_LABELS, type AmbassadorStatus } from '@/api/ambassadorApplicationApi'
import toast from '@/lib/toast'

type Props = {
  onClose: () => void
  /** Current filtered result count context, from the page's own table state. */
  currentFilterParams?: Record<string, string>
  currentSearch?: string
  selectedIds?: number[]
  totalFiltered?: number
}

const STEPS = ['الصيغة', 'السجلات', 'الحالة', 'التاريخ', 'الدولة', 'الجامعة', 'الأعمدة', 'المعاينة'] as const

const DATE_FIELD_LABELS: Record<AmbassadorExportDateField, string> = {
  created_at: 'تاريخ التقديم',
  reviewed_at: 'تاريخ المراجعة',
  status_updated_at: 'تاريخ آخر تحديث للحالة',
  updated_at: 'تاريخ آخر تعديل',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AmbassadorExportModal({ onClose, currentSearch, selectedIds = [] }: Props) {
  const [step, setStep] = useState(0)
  const [options, setOptions] = useState<AmbassadorExportOptions | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [preview, setPreview] = useState<AmbassadorExportPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const [format, setFormat] = useState<AmbassadorExportFormat>('xlsx')
  const [mode, setMode] = useState<AmbassadorExportMode>('filtered')
  const [statuses, setStatuses] = useState<string[]>([])
  const [countries, setCountries] = useState<string[]>([])
  const [universities, setUniversities] = useState<string[]>([])
  const [universityTypes, setUniversityTypes] = useState<string[]>([])
  const [majors, setMajors] = useState<string[]>([])
  const [studyYears, setStudyYears] = useState<string[]>([])
  const [dateField, setDateField] = useState<AmbassadorExportDateField>('created_at')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [columns, setColumns] = useState<string[]>([])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const o = await fetchAmbassadorExportOptions()
        if (!alive) return
        setOptions(o)
        setColumns(o.default_columns)
      } catch {
        if (alive) toast.error('تعذّر تحميل خيارات التصدير')
      } finally {
        if (alive) setLoadingOptions(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const requestBody = useMemo(() => ({
    format, mode,
    ids: mode === 'selected' ? selectedIds : undefined,
    search: mode === 'search' ? currentSearch : undefined,
    statuses: statuses.length ? statuses : undefined,
    countries: countries.length ? countries : undefined,
    universities: universities.length ? universities : undefined,
    university_types: universityTypes.length ? universityTypes : undefined,
    majors: majors.length ? majors : undefined,
    study_years: studyYears.length ? studyYears : undefined,
    date_field: dateFrom || dateTo ? dateField : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    columns,
  }), [format, mode, selectedIds, currentSearch, statuses, countries, universities, universityTypes, majors, studyYears, dateField, dateFrom, dateTo, columns])

  // Fetch preview numbers whenever the final step is reached. The loading flag
  // flips during render when `step` changes (render-phase adjustment — see
  // docs/04-references/effect-patterns.md §P2) so the effect only does the fetch.
  const [seenStep, setSeenStep] = useState(step)
  if (seenStep !== step) {
    setSeenStep(step)
    if (step === STEPS.length - 1) setPreviewLoading(true)
  }

  useEffect(() => {
    if (step !== STEPS.length - 1) return
    let alive = true
    void (async () => {
      try {
        const p = await fetchAmbassadorExportPreview(requestBody)
        if (alive) setPreview(p)
      } catch {
        if (alive) toast.error('تعذّر تحميل معاينة التصدير')
      } finally {
        if (alive) setPreviewLoading(false)
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  async function handleExport() {
    setExporting(true)
    try {
      await downloadAmbassadorExport(requestBody)
      toast.success('تم تصدير البيانات بنجاح')
      onClose()
    } catch {
      toast.error('تعذّر تصدير البيانات')
    } finally {
      setExporting(false)
    }
  }

  const canGoNext = step === 1 ? (mode !== 'selected' || selectedIds.length > 0) && (mode !== 'search' || Boolean(currentSearch)) : true

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ backdropFilter: 'blur(4px)' }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose} dir="rtl"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="flex h-full w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[88vh] sm:w-full sm:max-w-[760px] sm:rounded-3xl sm:shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
          <div>
            <h2 className="text-[15px] font-black text-deepBlue">تصدير البيانات</h2>
            <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/45">مركز تصدير طلبات سفراء التحول الرقمي</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-deepBlue" aria-label="إغلاق">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex shrink-0 items-center gap-1 px-5 pt-4 sm:px-7">
          {STEPS.map((s, i) => (
            <div key={s} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <motion.div className="absolute inset-y-0 right-0 rounded-full bg-customBlue" initial={false} animate={{ width: i <= step ? '100%' : '0%' }} transition={{ duration: 0.2 }} />
            </div>
          ))}
        </div>
        <div className="flex shrink-0 items-center justify-between px-5 pb-1 pt-2 text-[10px] font-black text-deepBlue/40 sm:px-7">
          <span>خطوة {step + 1} من {STEPS.length}</span>
          <span>{STEPS[step]}</span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {loadingOptions || !options ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-customBlue" /></div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.16 }}>

                {step === 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ['csv', 'CSV', FileText],
                      ['xlsx', 'Excel (.xlsx)', FileSpreadsheet],
                    ] as const).map(([val, label, Icon]) => (
                      <button key={val} type="button" onClick={() => setFormat(val)}
                        className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-6 transition ${format === val ? 'border-customBlue bg-sky-50' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <Icon className={`h-7 w-7 ${format === val ? 'text-customBlue' : 'text-slate-400'}`} />
                        <span className="text-[13px] font-black text-deepBlue">{label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-2">
                    {([
                      ['all', 'كل طلبات السفراء'],
                      ['filtered', 'النتائج المفلترة الحالية'],
                      ['selected', `الطلبات المحددة فقط (${selectedIds.length})`],
                      ['search', currentSearch ? `نتائج البحث الحالي ("${currentSearch}")` : 'نتائج البحث الحالي'],
                    ] as const).map(([val, label]) => {
                      const disabled = (val === 'selected' && selectedIds.length === 0) || (val === 'search' && !currentSearch)
                      return (
                        <label key={val} className={`flex items-center gap-3 rounded-2xl border p-3.5 transition ${mode === val ? 'border-customBlue bg-sky-50' : 'border-slate-200'} ${disabled ? 'opacity-40' : 'cursor-pointer hover:bg-slate-50'}`}>
                          <input type="radio" disabled={disabled} checked={mode === val} onChange={() => setMode(val)} className="h-4 w-4" />
                          <span className="text-[13px] font-bold text-deepBlue">{label}</span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {step === 2 && (
                  <FilterCheckboxGroup
                    title="حالات الطلب"
                    allLabel="الكل"
                    options={options.statuses.map((s) => ({ value: s, label: AMBASSADOR_STATUS_LABELS[s as AmbassadorStatus] ?? s }))}
                    selected={statuses} onToggle={(v) => toggle(statuses, setStatuses, v)} onSetAll={setStatuses}
                  />
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-black text-deepBlue/60">حقل التاريخ</label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {(Object.keys(DATE_FIELD_LABELS) as AmbassadorExportDateField[]).map((f) => (
                          <button key={f} type="button" onClick={() => setDateField(f)}
                            className={`h-9 rounded-xl text-[11px] font-black transition ${dateField === f ? 'bg-customBlue text-white' : 'border border-slate-200 text-deepBlue/60 hover:bg-slate-50'}`}
                          >
                            {DATE_FIELD_LABELS[f]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-[11px] font-black text-deepBlue/60">من تاريخ</label>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-[13px] font-bold text-deepBlue outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-black text-deepBlue/60">إلى تاريخ</label>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-[13px] font-bold text-deepBlue outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100" />
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <FilterCheckboxGroup
                    title="الدول"
                    allLabel="كل الدول"
                    options={options.countries.map((c) => ({ value: c, label: c }))}
                    selected={countries} onToggle={(v) => toggle(countries, setCountries, v)} onSetAll={setCountries}
                    scrollable
                  />
                )}

                {step === 5 && (
                  <div className="space-y-5">
                    <FilterCheckboxGroup title="الجامعة" allLabel="كل الجامعات" options={options.universities.map((u) => ({ value: u, label: u }))} selected={universities} onToggle={(v) => toggle(universities, setUniversities, v)} onSetAll={setUniversities} scrollable />
                    <FilterCheckboxGroup title="نوع الجامعة" allLabel="الكل" options={options.university_types.map((u) => ({ value: u, label: u }))} selected={universityTypes} onToggle={(v) => toggle(universityTypes, setUniversityTypes, v)} onSetAll={setUniversityTypes} />
                    <FilterCheckboxGroup title="التخصص" allLabel="كل التخصصات" options={options.majors.map((m) => ({ value: m, label: m }))} selected={majors} onToggle={(v) => toggle(majors, setMajors, v)} onSetAll={setMajors} scrollable />
                    <FilterCheckboxGroup title="السنة الدراسية" allLabel="الكل" options={options.study_years.map((y) => ({ value: y, label: y }))} selected={studyYears} onToggle={(v) => toggle(studyYears, setStudyYears, v)} onSetAll={setStudyYears} />
                  </div>
                )}

                {step === 6 && (
                  <ColumnPicker options={options} selected={columns} onChange={setColumns} />
                )}

                {step === 7 && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                      <div className="flex items-center gap-2 text-[13px] font-black text-deepBlue">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> معاينة التصدير
                      </div>
                      {previewLoading ? (
                        <div className="mt-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-customBlue" /></div>
                      ) : preview ? (
                        <dl className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                          <PreviewRow label="صيغة الملف" value={format === 'xlsx' ? 'Excel' : 'CSV'} />
                          <PreviewRow label="عدد السجلات" value={`${preview.records.toLocaleString('ar-EG')} طلب`} />
                          <PreviewRow label="الأعمدة المختارة" value={String(preview.columns)} />
                          <PreviewRow label="الحجم التقديري" value={formatBytes(preview.estimated_size_bytes)} />
                        </dl>
                      ) : null}
                      {preview?.truncated && (
                        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700">
                          النتائج تتجاوز الحد الأقصى ({options.max_rows.toLocaleString('ar-EG')} سجل) سيتم تصدير أول {options.max_rows.toLocaleString('ar-EG')} سجل فقط.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-5 py-4 sm:px-7">
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
            className="flex h-10 items-center gap-1.5 rounded-2xl border border-slate-200 px-4 text-[12px] font-black text-deepBlue/60 transition hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" /> السابق
          </button>
          {step === STEPS.length - 1 ? (
            <button type="button" disabled={exporting} onClick={() => void handleExport()}
              className="flex h-10 items-center gap-1.5 rounded-2xl bg-deepBlue px-6 text-[12px] font-black text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? 'جارِ التصدير...' : 'تصدير'}
            </button>
          ) : (
            <button type="button" disabled={!canGoNext} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="flex h-10 items-center gap-1.5 rounded-2xl bg-customBlue px-5 text-[12px] font-black text-white transition hover:opacity-90 disabled:opacity-40"
            >
              التالي <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3.5 py-2.5">
      <dt className="text-[10px] font-black text-deepBlue/40">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-black text-deepBlue">{value}</dd>
    </div>
  )
}

function FilterCheckboxGroup({ title, allLabel, options, selected, onToggle, onSetAll, scrollable }: {
  title: string
  allLabel: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (v: string) => void
  onSetAll: (v: string[]) => void
  scrollable?: boolean
}) {
  const allChecked = selected.length === 0
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12px] font-black text-deepBlue">{title}</p>
        {selected.length > 0 && (
          <button type="button" onClick={() => onSetAll([])} className="text-[11px] font-bold text-customBlue hover:underline">إعادة تعيين</button>
        )}
      </div>
      <div className={`flex flex-wrap gap-2 ${scrollable ? 'max-h-40 overflow-y-auto rounded-2xl border border-slate-100 p-2' : ''}`}>
        <label className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition ${allChecked ? 'border-customBlue bg-sky-50 text-customBlue' : 'border-slate-200 text-deepBlue/60'}`}>
          <input type="checkbox" checked={allChecked} onChange={() => onSetAll([])} className="h-3.5 w-3.5" />
          {allLabel}
        </label>
        {options.length === 0 ? (
          <span className="text-[11px] font-semibold text-slate-300">لا توجد بيانات</span>
        ) : options.map((o) => (
          <label key={o.value} className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition ${selected.includes(o.value) ? 'border-customBlue bg-sky-50 text-customBlue' : 'border-slate-200 text-deepBlue/60 hover:bg-slate-50'}`}>
            <input type="checkbox" checked={selected.includes(o.value)} onChange={() => onToggle(o.value)} className="h-3.5 w-3.5" />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  )
}

function ColumnPicker({ options, selected, onChange }: {
  options: AmbassadorExportOptions
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, { key: string; label: string }[]>()
    for (const c of options.columns) {
      if (!map.has(c.group)) map.set(c.group, [])
      map.get(c.group)!.push({ key: c.key, label: c.label })
    }
    return map
  }, [options.columns])

  const allKeys = options.columns.map((c) => c.key)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange(allKeys)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-black text-deepBlue/70 hover:bg-slate-50">تحديد الكل</button>
        <button type="button" onClick={() => onChange([])} className="rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-black text-deepBlue/70 hover:bg-slate-50">إلغاء تحديد الكل</button>
        <button type="button" onClick={() => onChange(options.default_columns)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-black text-deepBlue/70 hover:bg-slate-50">إعادة تعيين</button>
        <span className="mr-auto flex items-center text-[11px] font-black text-customBlue">{selected.length} عمود محدَّد</span>
      </div>

      {Array.from(grouped.entries()).map(([group, cols]) => (
        <div key={group}>
          <p className="mb-2 text-[12px] font-black text-deepBlue">{options.column_groups[group] ?? group}</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {cols.map((c) => (
              <label key={c.key} className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-deepBlue/70 hover:bg-slate-50">
                <input
                  type="checkbox" checked={selected.includes(c.key)}
                  onChange={() => onChange(selected.includes(c.key) ? selected.filter((k) => k !== c.key) : [...selected, c.key])}
                  className="h-3.5 w-3.5"
                />
                {selected.includes(c.key) && <Check className="h-3 w-3 text-customBlue" />}
                {c.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

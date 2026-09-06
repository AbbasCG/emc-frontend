import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, Save, Eye, ArrowLeft, RefreshCw, Type, Palette,
  Image, FileText, Sliders, ChevronDown, ChevronUp, CheckSquare, Square,
  Upload, AlertCircle, ExternalLink,
} from 'lucide-react'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import {
  fetchCertificateTemplate,
  fetchDefaultCertificateTemplate,
  previewDesigner,
  saveDesignerTemplate,
  uploadTemplateAsset,
  type CertificateTemplate,
  type DesignerCfg,
} from '@/api/certificatesApi'

// ── Debounce hook ─────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay = 700): T {
  const [dv, setDv] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return dv
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = 'branding' | 'typography' | 'colors' | 'signatures' | 'layout'

// ── Default config ────────────────────────────────────────────────────────────

const DEFAULT_CFG: Required<DesignerCfg> = {
  org_name_en: 'Educational Mastar Central',
  org_name_ar: 'مركز ماستر التعليمي',
  org2_name_en: '',
  org2_name_ar: '',
  learning_path_name_ar: 'المعسكر الصيفي ٢٠٢٦',
  learning_path_name_en: 'AI Summer Camp 2026',
  font_arabic: 'Cairo',
  font_english: 'Poppins',
  color_primary: '#0D2741',
  color_secondary: '#F57C00',
  color_accent: '#009DDB',
  color_text: '#1A1A1A',
  show_admin_signature: true,
  show_program_signature: true,
  show_official_stamp: true,
  admin_sig_image: null,
  admin_sig_name_en: 'Tareq Tuaayman',
  admin_sig_name_ar: 'طارق طعيمان',
  admin_sig_title_en: 'Founder & General Manager – EMC',
  admin_sig_title_ar: 'مؤسس ومدير عام – EMC',
  program_sig_image: null,
  program_sig_name_en: '',
  program_sig_name_ar: 'إدارة المعسكر الصيفي للذكاء الاصطناعي',
  program_sig_title_en: '',
  program_sig_title_ar: 'مركز ماستر التعليمي – EMC',
  official_stamp_image: null,
  paper_size: 'A4',
  orientation: 'landscape',
  pdf_quality: 'high',
  margin_top: 8,
  margin_bottom: 8,
  margin_left: 12,
  margin_right: 12,
  bg_style: 'default',
  border_style: 'default',
  blade_path: 'certificates.templates.default',
  code_prefix: 'EMC',
}

function templateToCfg(t: CertificateTemplate): Required<DesignerCfg> {
  const r = t as unknown as Record<string, unknown>
  const str = (k: string, fb: string) => (r[k] as string) || fb
  const bool = (k: string, fb: boolean) => r[k] != null ? Boolean(r[k]) : fb
  const num = (k: string, fb: number) => r[k] != null ? Number(r[k]) : fb
  return {
    ...DEFAULT_CFG,
    org_name_en: str('org_name_en', DEFAULT_CFG.org_name_en),
    org_name_ar: str('org_name_ar', DEFAULT_CFG.org_name_ar),
    org2_name_en: str('org2_name_en', ''),
    org2_name_ar: str('org2_name_ar', ''),
    learning_path_name_ar: str('learning_path_name_ar', DEFAULT_CFG.learning_path_name_ar),
    learning_path_name_en: str('learning_path_name_en', DEFAULT_CFG.learning_path_name_en),
    font_arabic: str('font_arabic', 'Cairo'),
    font_english: str('font_english', 'Poppins'),
    color_primary: str('color_primary', DEFAULT_CFG.color_primary),
    color_secondary: str('color_secondary', DEFAULT_CFG.color_secondary),
    color_accent: str('color_accent', DEFAULT_CFG.color_accent),
    color_text: str('color_text', DEFAULT_CFG.color_text),
    show_admin_signature: bool('show_admin_signature', true),
    show_program_signature: bool('show_program_signature', true),
    show_official_stamp: bool('show_official_stamp', true),
    admin_sig_image: (r['admin_sig_image'] as string) || null,
    admin_sig_name_en: str('admin_sig_name_en', DEFAULT_CFG.admin_sig_name_en),
    admin_sig_name_ar: str('admin_sig_name_ar', DEFAULT_CFG.admin_sig_name_ar),
    admin_sig_title_en: str('admin_sig_title_en', DEFAULT_CFG.admin_sig_title_en),
    admin_sig_title_ar: str('admin_sig_title_ar', DEFAULT_CFG.admin_sig_title_ar),
    program_sig_image: (r['program_sig_image'] as string) || null,
    program_sig_name_en: str('program_sig_name_en', ''),
    program_sig_name_ar: str('program_sig_name_ar', DEFAULT_CFG.program_sig_name_ar),
    program_sig_title_en: str('program_sig_title_en', ''),
    program_sig_title_ar: str('program_sig_title_ar', DEFAULT_CFG.program_sig_title_ar),
    official_stamp_image: (r['official_stamp_image'] as string) || null,
    paper_size: str('paper_size', 'A4'),
    orientation: (str('orientation', 'landscape')) as 'landscape' | 'portrait',
    pdf_quality: (str('pdf_quality', 'high')) as 'standard' | 'high' | 'print',
    margin_top: num('margin_top', 8),
    margin_bottom: num('margin_bottom', 8),
    margin_left: num('margin_left', 12),
    margin_right: num('margin_right', 12),
    bg_style: (str('bg_style', 'default')) as Required<DesignerCfg>['bg_style'],
    border_style: (str('border_style', 'default')) as Required<DesignerCfg>['border_style'],
    blade_path: str('blade_path', 'certificates.templates.default'),
    code_prefix: str('code_prefix', 'EMC'),
  }
}

// ── UI sub-components ─────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title, open, onToggle,
}: { icon: React.ElementType; title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10"
    >
      <span className="flex items-center gap-2 text-sm font-medium text-white/90">
        <Icon size={14} className="text-blue-400" />
        {title}
      </span>
      {open ? <ChevronUp size={13} className="text-white/40" /> : <ChevronDown size={13} className="text-white/40" />}
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-white/50">{label}</label>
      {children}
    </div>
  )
}

function SInput({ value, onChange, placeholder, dir }: {
  value: string; onChange: (v: string) => void; placeholder?: string; dir?: 'rtl' | 'ltr'
}) {
  return (
    <input
      dir={dir}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/25 focus:border-blue-400/60 focus:bg-white/15 focus:outline-none transition-colors"
    />
  )
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <label className="relative flex-shrink-0 cursor-pointer">
        <div className="h-7 w-7 rounded-md border-2 border-white/20" style={{ backgroundColor: value }} />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-white/45">{label}</p>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className="w-full bg-transparent font-mono text-xs text-white/70 focus:outline-none"
        />
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="flex items-center gap-2 text-sm text-white/75 transition-colors hover:text-white">
      {value ? <CheckSquare size={15} className="text-blue-400" /> : <Square size={15} className="text-white/30" />}
      {label}
    </button>
  )
}

function AssetUploader({ label, field, templateId, onUploaded }: {
  label: string
  field: 'logo_primary' | 'logo_secondary' | 'admin_sig_image' | 'program_sig_image' | 'official_stamp_image'
  templateId: number | null
  onUploaded: (url: string, path: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!templateId) return
    setUploading(true)
    try {
      const res = await uploadTemplateAsset(templateId, field, file)
      onUploaded(res.url, res.path)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-white/50">{label}</label>
      <button
        disabled={uploading || !templateId}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/20 disabled:opacity-40"
      >
        {uploading ? <RefreshCw size={11} className="animate-spin" /> : <Upload size={11} />}
        {uploading ? 'جارٍ الرفع…' : 'رفع صورة'}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminCertificateDesignerPage() {
  const { id: rawId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Guard: NaN / undefined / literal "{id}" all redirect to default template
  const paramId = rawId && rawId !== '{id}' ? Number(rawId) : NaN

  const [template, setTemplate] = useState<CertificateTemplate | null>(null)
  const [cfg, setCfg] = useState<Required<DesignerCfg>>(DEFAULT_CFG)
  const [previewHtml, setPreviewHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [scale, setScale] = useState(0.52)
  const [openSections, setOpenSections] = useState<Record<Section, boolean>>({
    branding: true,
    typography: false,
    colors: false,
    signatures: false,
    layout: false,
  })

  const debouncedCfg = useDebounce(cfg, 600)

  // Re-arm the loading state during render when the route param changes (react.dev
  // "adjusting state when a prop changes"); `loading` already starts true on mount.
  // `Object.is` so the NaN placeholder compares equal to itself.
  const [seenParamId, setSeenParamId] = useState(paramId)
  if (!Object.is(seenParamId, paramId)) {
    setSeenParamId(paramId)
    setLoading(true)
    setLoadErr(null)
  }

  // Same for the preview: seeded with `null` so the very first render also arms
  // `refreshing`, exactly as the effect below used to do on mount.
  const [seenPreviewCfg, setSeenPreviewCfg] = useState<Required<DesignerCfg> | null>(null)
  if (seenPreviewCfg !== debouncedCfg) {
    setSeenPreviewCfg(debouncedCfg)
    setRefreshing(true)
  }

  // ── Load template (with NaN guard) ────────────────────────────────────────
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const t = Number.isNaN(paramId)
          ? await fetchDefaultCertificateTemplate()
          : await fetchCertificateTemplate(paramId)
        if (!alive) return
        setTemplate(t)
        setCfg(templateToCfg(t))
        // If we loaded via default but the URL has NaN/missing, fix the URL
        if (Number.isNaN(paramId)) {
          navigate(`/dashboard/admin/certificates/templates/${t.id}/designer`, { replace: true })
        }
      } catch {
        if (alive) setLoadErr('تعذّر تحميل بيانات القالب.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [paramId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live preview ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const html = await previewDesigner(debouncedCfg)
        if (!cancelled) setPreviewHtml(html)
      } catch {
        /* keep the previous preview */
      } finally {
        if (!cancelled) setRefreshing(false)
      }
    })()
    return () => { cancelled = true }
  }, [debouncedCfg])

  const set = useCallback(<K extends keyof Required<DesignerCfg>>(key: K, val: Required<DesignerCfg>[K]) => {
    setCfg((prev) => ({ ...prev, [key]: val }))
  }, [])

  const toggleSection = (s: Section) =>
    setOpenSections((prev) => ({ ...prev, [s]: !prev[s] }))

  const handleSave = async () => {
    if (!template) return
    setSaving(true)
    setSaveOk(false)
    try {
      await saveDesignerTemplate(template.id, { ...cfg, name: template.name })
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  // ── Error / loading states ────────────────────────────────────────────────
  if (loading) {
    return (
      <AdminLmsShell title="مصمم الشهادة" description="" breadcrumb="المصمم">
        <div className="flex h-96 items-center justify-center gap-2 text-white/40">
          <RefreshCw size={16} className="animate-spin" />
          جارٍ تحميل المصمم…
        </div>
      </AdminLmsShell>
    )
  }

  if (loadErr) {
    return (
      <AdminLmsShell title="مصمم الشهادة" description="" breadcrumb="المصمم">
        <div className="flex h-96 flex-col items-center justify-center gap-3 text-white/50">
          <AlertCircle size={32} className="text-rose-400" />
          <p>{loadErr}</p>
          <button onClick={() => window.location.reload()}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500">
            إعادة المحاولة
          </button>
        </div>
      </AdminLmsShell>
    )
  }

  return (
    <AdminLmsShell title="مصمم الشهادة" description="تخصيص قالب الشهادة ومعاينته مباشرة" breadcrumb="المصمم">
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0a1520]">

        {/* ── Left sidebar ──────────────────────────────────────────────── */}
        <div className="flex w-[300px] flex-shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-[#111e2e]">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-4">
            <button onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white/80">
              <ArrowLeft size={14} />
              رجوع
            </button>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-white/80">
              <Settings size={13} className="text-blue-400" />
              مصمم الشهادة
            </span>
          </div>

          {/* Template info */}
          {template && (
            <div className="border-b border-white/5 px-4 py-3">
              <p className="text-[10px] text-white/35">القالب النشط</p>
              <p className="mt-0.5 text-sm font-semibold text-white">{template.name}</p>
              <p className="mt-0.5 font-mono text-[10px] text-white/30">
                resources/views/certificates/templates/default.blade.php
              </p>
            </div>
          )}

          {/* Sections */}
          <div className="flex-1 space-y-2 px-3 py-4">

            {/* BRANDING */}
            <SectionHeader icon={Image} title="العلامة التجارية" open={openSections.branding} onToggle={() => toggleSection('branding')} />
            <AnimatePresence>
              {openSections.branding && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-2 pb-2">
                  <div className="space-y-3 pt-1">
                    <Field label="اسم المسار / المعسكر (عربي)">
                      <SInput value={cfg.learning_path_name_ar} onChange={(v) => set('learning_path_name_ar', v)} dir="rtl" />
                    </Field>
                    <Field label="Learning Path / Camp Name (EN)">
                      <SInput value={cfg.learning_path_name_en} onChange={(v) => set('learning_path_name_en', v)} dir="ltr" />
                    </Field>
                    <Field label="اسم الجهة (عربي)">
                      <SInput value={cfg.org_name_ar} onChange={(v) => set('org_name_ar', v)} dir="rtl" />
                    </Field>
                    <Field label="Organization Name (EN)">
                      <SInput value={cfg.org_name_en} onChange={(v) => set('org_name_en', v)} dir="ltr" />
                    </Field>
                    <AssetUploader label="الشعار الرئيسي" field="logo_primary"
                      templateId={template?.id ?? null}
                      onUploaded={(_, path) => set('admin_sig_image', path)} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TYPOGRAPHY */}
            <SectionHeader icon={Type} title="الخطوط" open={openSections.typography} onToggle={() => toggleSection('typography')} />
            <AnimatePresence>
              {openSections.typography && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-2 pb-2">
                  <div className="space-y-3 pt-1">
                    <Field label="خط عربي">
                      <select value={cfg.font_arabic} onChange={(e) => set('font_arabic', e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/60">
                        {['Cairo', 'Tajawal', 'Amiri', 'Noto Naskh Arabic', 'IBM Plex Arabic'].map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="English Font">
                      <select value={cfg.font_english} onChange={(e) => set('font_english', e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/60">
                        {['Poppins', 'Inter', 'Montserrat', 'Playfair Display', 'Lato', 'Raleway'].map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* COLORS */}
            <SectionHeader icon={Palette} title="الألوان" open={openSections.colors} onToggle={() => toggleSection('colors')} />
            <AnimatePresence>
              {openSections.colors && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-2 pb-2">
                  <div className="space-y-3 pt-1">
                    <ColorInput label="اللون الأساسي (أزرق داكن)" value={cfg.color_primary} onChange={(v) => set('color_primary', v)} />
                    <ColorInput label="اللون الثانوي (برتقالي)" value={cfg.color_secondary} onChange={(v) => set('color_secondary', v)} />
                    <ColorInput label="لون التمييز (أزرق سماوي)" value={cfg.color_accent} onChange={(v) => set('color_accent', v)} />
                    <ColorInput label="لون النص" value={cfg.color_text} onChange={(v) => set('color_text', v)} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SIGNATURES */}
            <SectionHeader icon={FileText} title="التوقيعات والختم" open={openSections.signatures} onToggle={() => toggleSection('signatures')} />
            <AnimatePresence>
              {openSections.signatures && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-2 pb-2">
                  <div className="space-y-3 pt-1">
                    <Toggle label="توقيع الإدارة العليا" value={cfg.show_admin_signature} onChange={(v) => set('show_admin_signature', v)} />
                    {cfg.show_admin_signature && (
                      <div className="space-y-2 border-r-2 border-blue-400/20 pr-3">
                        <Field label="الاسم (عربي)">
                          <SInput value={cfg.admin_sig_name_ar} onChange={(v) => set('admin_sig_name_ar', v)} dir="rtl" />
                        </Field>
                        <Field label="المسمى الوظيفي (عربي)">
                          <SInput value={cfg.admin_sig_title_ar} onChange={(v) => set('admin_sig_title_ar', v)} dir="rtl" />
                        </Field>
                        <Field label="Name (EN)">
                          <SInput value={cfg.admin_sig_name_en} onChange={(v) => set('admin_sig_name_en', v)} dir="ltr" />
                        </Field>
                        <Field label="Title (EN)">
                          <SInput value={cfg.admin_sig_title_en} onChange={(v) => set('admin_sig_title_en', v)} dir="ltr" />
                        </Field>
                        <AssetUploader label="صورة التوقيع" field="admin_sig_image"
                          templateId={template?.id ?? null}
                          onUploaded={(_, path) => set('admin_sig_image', path)} />
                      </div>
                    )}

                    <Toggle label="توقيع إدارة البرامج" value={cfg.show_program_signature} onChange={(v) => set('show_program_signature', v)} />
                    {cfg.show_program_signature && (
                      <div className="space-y-2 border-r-2 border-blue-400/20 pr-3">
                        <Field label="الاسم (عربي)">
                          <SInput value={cfg.program_sig_name_ar} onChange={(v) => set('program_sig_name_ar', v)} dir="rtl" />
                        </Field>
                        <Field label="المسمى (عربي)">
                          <SInput value={cfg.program_sig_title_ar} onChange={(v) => set('program_sig_title_ar', v)} dir="rtl" />
                        </Field>
                        <AssetUploader label="صورة التوقيع (البرامج)" field="program_sig_image"
                          templateId={template?.id ?? null}
                          onUploaded={(_, path) => set('program_sig_image', path)} />
                      </div>
                    )}

                    <Toggle label="الختم الرسمي" value={cfg.show_official_stamp} onChange={(v) => set('show_official_stamp', v)} />
                    {cfg.show_official_stamp && (
                      <div className="border-r-2 border-blue-400/20 pr-3">
                        <AssetUploader label="صورة الختم" field="official_stamp_image"
                          templateId={template?.id ?? null}
                          onUploaded={(_, path) => set('official_stamp_image', path)} />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* LAYOUT */}
            <SectionHeader icon={Sliders} title="التخطيط والهوامش" open={openSections.layout} onToggle={() => toggleSection('layout')} />
            <AnimatePresence>
              {openSections.layout && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-2 pb-2">
                  <div className="space-y-3 pt-1">
                    <Field label="خلفية الشهادة">
                      <select value={cfg.bg_style}
                        onChange={(e) => set('bg_style', e.target.value as Required<DesignerCfg>['bg_style'])}
                        className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/60">
                        <option value="default">افتراضي (أقواس)</option>
                        <option value="ornate">زخرفي</option>
                        <option value="minimal">بسيط</option>
                        <option value="none">بلا خلفية</option>
                      </select>
                    </Field>
                    <Field label="إطار الشهادة">
                      <select value={cfg.border_style}
                        onChange={(e) => set('border_style', e.target.value as Required<DesignerCfg>['border_style'])}
                        className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/60">
                        <option value="default">إطار رفيع</option>
                        <option value="none">بلا إطار</option>
                      </select>
                    </Field>
                    <Field label="جودة PDF">
                      <select value={cfg.pdf_quality}
                        onChange={(e) => set('pdf_quality', e.target.value as Required<DesignerCfg>['pdf_quality'])}
                        className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/60">
                        <option value="standard">قياسية (72 DPI)</option>
                        <option value="high">عالية (150 DPI)</option>
                        <option value="print">طباعة (300 DPI)</option>
                      </select>
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      {(['top', 'bottom', 'left', 'right'] as const).map((side) => {
                        const key = `margin_${side}` as keyof Required<DesignerCfg>
                        const labels: Record<string, string> = { top: 'أعلى', bottom: 'أسفل', left: 'يسار', right: 'يمين' }
                        return (
                          <Field key={side} label={`هامش ${labels[side]} (mm)`}>
                            <input type="number" min={0} max={50}
                              value={cfg[key] as number}
                              onChange={(e) => set(key, Number(e.target.value) as never)}
                              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/60" />
                          </Field>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Footer: scale + save */}
          <div className="border-t border-white/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Eye size={12} className="text-white/30 flex-shrink-0" />
              <input type="range" min={0.3} max={0.85} step={0.05} value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="flex-1 accent-blue-400" />
              <span className="w-8 text-right text-[11px] text-white/35">{Math.round(scale * 100)}%</span>
            </div>

            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors ${
                saveOk ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-50'
              }`}
            >
              {saving
                ? <><RefreshCw size={13} className="animate-spin" />جارٍ الحفظ…</>
                : saveOk
                ? <><span>✓</span>تم الحفظ</>
                : <><Save size={13} />حفظ القالب</>}
            </button>

            {template && (
              <button
                onClick={() => navigate(`/dashboard/admin/certificates`)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2 text-xs text-white/50 transition-colors hover:text-white/70"
              >
                <ExternalLink size={11} />
                عرض الشهادات
              </button>
            )}
          </div>
        </div>

        {/* ── Preview canvas ────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-white/5 bg-[#111e2e] px-6 py-3">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Eye size={13} className="text-blue-400" />
              معاينة مباشرة
              {refreshing && <RefreshCw size={11} className="animate-spin text-blue-400/70" />}
            </div>
            <span className="text-[11px] text-white/25">A4 Landscape · 297 × 210 mm</span>
          </div>

          {/* Certificate canvas */}
          <div className="flex flex-1 items-start justify-center overflow-auto bg-[#0a1520] p-10">
            {previewHtml ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  // A4 landscape at 96dpi: 297mm = 1122px, 210mm = 794px
                  width: 1122,
                  height: 794,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top center',
                  flexShrink: 0,
                  boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
                  borderRadius: 4,
                }}
              >
                <iframe
                  srcDoc={previewHtml}
                  title="Certificate Preview"
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: 4 }}
                  sandbox="allow-same-origin"
                />
              </motion.div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-white/20">
                <RefreshCw size={24} className="animate-spin" />
                <p className="text-sm">جارٍ تحميل المعاينة…</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </AdminLmsShell>
  )
}

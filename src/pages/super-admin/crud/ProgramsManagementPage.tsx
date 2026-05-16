import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, RefreshCw } from 'lucide-react'
import { fetchCoursesStrict } from '@/api/superAdminCatalogApi'
import type { Course } from '@/types'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { CrudFilterBar, MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { CrudCardTable, CrudTable, Th, Tr, Td } from '@/pages/super-admin/crud/shared/TableChrome'
import { LoadingPanel, EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import { CrudModal } from '@/pages/super-admin/crud/shared/Modal'
import { formatEuro } from '@/utils/currency'
import {
  SaGlassCard,
  SaPageRoot,
  SaStatChip,
  SaToolbar,
} from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'

type Mode = 'all' | 'free' | 'paid' | 'online' | 'offline'

export default function ProgramsManagementPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Course[]>([])
  const [failed, setFailed] = useState(false)
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<Mode>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [preview, setPreview] = useState<Course | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    const pack = await fetchCoursesStrict()
    if (!pack.ok) {
      setFailed(true)
      setRows([])
    } else {
      setRows(pack.rows)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return rows.filter((c) => {
      const online = typeof c.is_online === 'boolean' ? c.is_online : Number(c.is_online) === 1
      const numericPrice = typeof c.price === 'string' ? parseFloat(String(c.price)) : Number(c.price)
      const isPaidCourse = String(c.type) === 'paid' || (Number.isFinite(numericPrice) && numericPrice > 0)

      if (mode === 'online' && !online) return false
      if (mode === 'offline' && online) return false
      if (mode === 'free' && isPaidCourse) return false
      if (mode === 'paid' && !isPaidCourse) return false

      const hay = `${c.title} ${c.slug} ${c.instructor_name ?? ''}`.toLowerCase()
      return !t || hay.includes(t)
    })
  }, [rows, q, mode])

  const paidCount = rows.filter((c) => {
    const n = typeof c.price === 'string' ? parseFloat(String(c.price)) : Number(c.price)
    return String(c.type) === 'paid' || (Number.isFinite(n) && n > 0)
  }).length
  const onlineCount = rows.filter((c) => (typeof c.is_online === 'boolean' ? c.is_online : Number(c.is_online) === 1)).length

  const spotlight = filtered.slice(0, 9)

  return (
    <SaPageRoot>
      <SaToolbar
        eyebrow="كتالوج البرامج"
        title="البرامج"
        subtitle="شبكة مختارة للكتالوج مع جدول تشغيلي كامل في الأسفل — المصدر GET /courses دون بيانات وهمية عند الخطأ."
        actions={
          <>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-[12px] font-black text-deepBlue shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              تحديث
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-2xl bg-[#2691C2] px-4 py-2.5 text-[12px] font-black text-white shadow-md"
            >
              إنشاء برنامج
            </button>
            <Link
              to="/programs"
              className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-[12px] font-black text-brand-900"
            >
              معاينة عامة
            </Link>
          </>
        }
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SaStatChip label="إجمالي البرامج" value={rows.length} tone="blue" />
        <SaStatChip label="مدفوعة" value={paidCount} tone="orange" />
        <SaStatChip label="عن بُعد" value={onlineCount} tone="success" />
        <SaStatChip label="مجانية أو صفر" value={rows.length - paidCount} tone="ink" />
      </div>

      <CrudFilterBar searchValue={q} onSearchChange={setQ} searchPlaceholder="بحث بالعنوان أو المختصر أو اسم المدرِّس…">
        <MiniSelect
          label="التصنيف"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: 'all', labelAr: 'الكل' },
            { value: 'free', labelAr: 'مجاني' },
            { value: 'paid', labelAr: 'مدفوع' },
            { value: 'online', labelAr: 'عن بُعد' },
            { value: 'offline', labelAr: 'حضوري' },
          ]}
        />
      </CrudFilterBar>

      {failed ?
        <ErrorPanel title="تعذّر الاتصال بـ GET /courses" hint="لا تُحمَّل أي بيانات وهمية. تحقّق من التشغيل المحلي أو مفاتيح البيئة." />
      : loading ?
        <LoadingPanel />
      : !filtered.length ?
        <EmptyPanel title="لا برامج مطابقة للفلاتر الحالية." subtitle="امسح البحث أو غيّر نوع الدورة لمشاهدة المزيد." />
      :
        <>
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3 text-right">
              <h2 className="text-sm font-black text-deepBlue">مختارات الكتالوج</h2>
              <BookOpen className="h-5 w-5 text-customBlue/40" aria-hidden />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {spotlight.map((c) => {
                const online = typeof c.is_online === 'boolean' ? c.is_online : Number(c.is_online) === 1
                const n = typeof c.price === 'string' ? parseFloat(String(c.price)) : Number(c.price)
                const paid = String(c.type) === 'paid' || (Number.isFinite(n) && n > 0)
                return (
                  <SaGlassCard key={`spot-${c.id}`} className="flex flex-col p-4 text-right" glow="orange">
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-100 text-xs font-black text-deepBlue ring-1 ring-brand-200/70">
                        {initialsFromName(c.title)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 font-black text-deepBlue">{c.title}</p>
                        <code className="mt-1 block truncate text-[11px] text-muted-600">{c.slug}</code>
                        <div className="mt-2 flex flex-wrap justify-start gap-2">
                          {c.status ?
                            <CrudBadge variant="accent">{c.status}</CrudBadge>
                          : null}
                          {online ?
                            <CrudBadge variant="brand">عن بعد</CrudBadge>
                          : (
                            <CrudBadge variant="default">حضوري</CrudBadge>
                          )}
                          <CrudBadge variant={paid ? 'accent' : 'success'}>
                            {paid ?
                              `${formatEuro(n, { locale: 'ar', minimumFractionDigits: 0, maximumFractionDigits: 0 })} تقريبي`
                            : 'مجانية'}
                          </CrudBadge>
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto flex justify-between gap-2 border-t border-ink-100/60 pt-3">
                      <p className="text-[11px] font-bold text-muted-500">{(c.start_date ?? '—').toString().slice(0, 10)}</p>
                      <RowActionsMenu
                        ariaLabel={c.title}
                        actions={[
                          { key: 'v', label: 'لمحة', onClick: () => setPreview(c) },
                          { key: 'site', label: 'صفحة الزائر', onClick: () => window.open(`/courses/${c.slug}`, '_blank') },
                        ]}
                      />
                    </div>
                  </SaGlassCard>
                )
              })}
            </div>
          </div>

          <SaGlassCard className="mt-8 overflow-hidden p-0">
            <div className="border-b border-ink-100 bg-slate-50/90 px-4 py-3 text-right">
              <p className="text-[11px] font-black text-deepBlue">جدول البرامج الكامل</p>
            </div>
            <CrudCardTable>
              <CrudTable>
                <thead>
                  <tr>
                    <Th>البرنامج</Th>
                    <Th>السعر والصنف</Th>
                    <Th>البيئة التدريبية</Th>
                    <Th>البداية</Th>
                    <Th className="text-end">إجراءات</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const online = typeof c.is_online === 'boolean' ? c.is_online : Number(c.is_online) === 1
                    return (
                      <Tr key={c.id}>
                        <Td>
                          <div dir="rtl" className="flex min-w-0 items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-100 text-[11px] font-black text-deepBlue ring-1 ring-brand-200/70">
                              {initialsFromName(c.title)}
                            </div>
                            <div className="min-w-0 flex-1 text-right rtl:text-right">
                              <p className="truncate font-black text-deepBlue">{c.title}</p>
                              <code className="block text-[11px] text-muted-600">{c.slug}</code>
                            </div>
                          </div>
                        </Td>
                        <Td className="text-[12px] font-bold rtl:text-right">
                          <CrudBadge
                            variant={
                              (() => {
                                const n = typeof c.price === 'string' ? parseFloat(String(c.price)) : Number(c.price)
                                return String(c.type) === 'paid' || (Number.isFinite(n) && n > 0) ? 'accent' : 'success'
                              })()
                            }
                          >
                            {(() => {
                              const n = typeof c.price === 'string' ? parseFloat(String(c.price)) : Number(c.price)
                              return Number.isFinite(n) && n > 0
                                ? `${formatEuro(n, { locale: 'ar', minimumFractionDigits: 0, maximumFractionDigits: 0 })} تقريبي`
                                : 'مجانية'
                            })()}
                          </CrudBadge>
                        </Td>
                        <Td>
                          {online ?
                            <CrudBadge variant="brand">عن بعد</CrudBadge>
                          : <CrudBadge variant="default">حضوري</CrudBadge>}
                        </Td>
                        <Td className="text-[11px] font-bold text-muted-600 rtl:text-right">
                          {(c.start_date ?? '—').toString().slice(0, 10)}
                        </Td>
                        <Td className="text-end">
                          <RowActionsMenu
                            ariaLabel={c.title}
                            actions={[
                              { key: 'v', label: 'لمحة مختصرة', onClick: () => setPreview(c) },
                              { key: 'site', label: 'صفحة الزائر', onClick: () => window.open(`/courses/${c.slug}`, '_blank') },
                            ]}
                          />
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </CrudTable>
            </CrudCardTable>
          </SaGlassCard>
        </>
      }

      <CrudModal open={createOpen} onClose={() => setCreateOpen(false)} title="إنشاء برنامج جديد" subtitle="جاهزية الخلفية">
        <div className="space-y-3 text-right text-[13px] font-semibold text-muted-700">
          <p>
            وحدة EMC الحالية لا تعرض نقطة مسؤول لـ POST برامج جديدة في هذه الشاشة. استخدم مخطّط LMS / الإدارات التشغيلية أو
            تذكر تفعيل نقطة مستقبلية عند الجهوزية لمتابعة هذا المسار الإداري.
          </p>
          <Link to="/courses" className="inline-flex font-black text-customBlue underline">
            الانتقال إلى كتالوج الزائر
          </Link>
        </div>
      </CrudModal>

      <CrudModal
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.title ?? ''}
        subtitle={preview?.instructor_name ? `بالتعاون مع ${preview.instructor_name}` : 'لمحة داخل لوحة الإدارة'}
      >
        {preview ?
          <div className="space-y-2 text-right text-[13px] font-semibold text-muted-700">
            <p className="line-clamp-4">{preview.short_description ?? preview.description ?? 'لا وصف مختصر مسجَّل بعد.'}</p>
            <div dir="rtl" className="flex flex-wrap justify-start gap-2 rtl:text-right">
              <CrudBadge variant="brand">{preview.slug}</CrudBadge>
              {preview.status ?
                <CrudBadge variant="accent">{preview.status}</CrudBadge>
              : null}
            </div>
          </div>
        : null}
      </CrudModal>
    </SaPageRoot>
  )
}

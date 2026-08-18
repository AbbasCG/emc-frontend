import { useCallback, useEffect, useState } from 'react'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import EmptyState from '@/components/dashboard/EmptyState'
import { Briefcase, Phone, UserCircle2, Clock, Plus } from 'lucide-react'
import { fetchPartners } from '@/api/partnersApi'
import type { PartnersResponse } from '@/api/partnersApi'
import type { PartnerRecord } from '@/types/operations'
import PartnerCrmModal from '@/components/operations/PartnerCrmModal'
import { formatDate } from '@/utils/dateTime'
import clsx from 'clsx'

const LOAD_ERROR = 'تعذّر تحميل الشركاء. تحقق من الاتصال وأعد المحاولة.'

type ProjectScope = 'EMC_GENERAL' | 'HACKATHON' | 'BOOTCAMP'

export default function OpsPartnersPage() {
  const [items, setItems] = useState<PartnerRecord[]>([])
  const [kpis, setKpis] = useState<PartnersResponse['kpis']>({ total: 0, actual: 0, negotiation: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  const [activeTab, setActiveTab] = useState<ProjectScope>('EMC_GENERAL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<PartnerRecord | null>(null)

  const loadData = useCallback(async (scope: ProjectScope) => {
    setLoadError(null)
    setLoading(true)
    try {
      const res = await fetchPartners(scope)
      setItems(res.rows)
      setKpis(res.kpis)
    } catch {
      setLoadError(LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData(activeTab)
  }, [activeTab, loadData])

  const handleEdit = (p: PartnerRecord) => {
    setEditingPartner(p)
    setIsModalOpen(true)
  }

  const handleAddNew = () => {
    setEditingPartner(null)
    setIsModalOpen(true)
  }

  if (loading && items.length === 0) return <OpsPageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void loadData(activeTab)} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <header className="rounded-[1.35rem] bg-gradient-to-r from-deepBlue to-customBlue p-8 text-right shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-black text-white">إدارة العلاقات والشراكات (CRM)</h1>
            <p className="mt-2 text-sm font-semibold text-sky-100">
              منظومة متكاملة لإدارة بيانات الشركاء، المتابعات، وتحليل معدلات الاستجابة والتفاوض.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddNew}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-deepBlue shadow-sm transition hover:bg-slate-50 hover:shadow-md"
            >
              <Plus size={18} />
              إضافة شريك جديد
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-deepBlue/[0.04]">
        {[
          { id: 'EMC_GENERAL', label: 'شراكات المركز العامة' },
          { id: 'HACKATHON', label: 'شراكات الهاكاثون' },
          { id: 'BOOTCAMP', label: 'شراكات المعسكر المهني' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ProjectScope)}
            className={clsx(
              "rounded-xl px-5 py-2.5 text-sm font-black transition-all",
              activeTab === tab.id
                ? "bg-customBlue text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-deepBlue"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500">إجمالي الجهات</div>
          <div className="mt-2 text-3xl font-black text-deepBlue">{kpis.total}</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
          <div className="text-xs font-bold text-emerald-600">الشركاء الفعليون</div>
          <div className="mt-2 text-3xl font-black text-emerald-700">{kpis.actual}</div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 shadow-sm">
          <div className="text-xs font-bold text-amber-600">قيد المتابعة والتفاوض</div>
          <div className="mt-2 text-3xl font-black text-amber-700">{kpis.negotiation}</div>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-5 shadow-sm">
          <div className="text-xs font-bold text-rose-600">مرفوض / متعثر</div>
          <div className="mt-2 text-3xl font-black text-rose-700">{kpis.rejected}</div>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <div className="py-12">
            <EmptyState icon={Briefcase} title="لا توجد جهات مسجلة في هذا المسار" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-4">اسم الجهة</th>
                  <th className="px-6 py-4">التصنيف والنوع</th>
                  <th className="px-6 py-4">ممثل الجهة</th>
                  <th className="px-6 py-4">مسؤول المتابعة</th>
                  <th className="px-6 py-4">تاريخ آخر تواصل</th>
                  <th className="px-6 py-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-black text-deepBlue">{p.name}</div>
                      <div className="text-[11px] font-semibold text-slate-400">{p.field_of_work || 'غير محدد'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={clsx(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-black",
                          p.classification === 'Actual Partner' && "bg-emerald-100 text-emerald-700",
                          p.classification === 'Potential' && "bg-blue-100 text-blue-700",
                          p.classification === 'Under Negotiation' && "bg-amber-100 text-amber-700",
                          p.classification === 'Rejected' && "bg-rose-100 text-rose-700",
                          !p.classification && "bg-slate-100 text-slate-700"
                        )}>
                          {p.classification === 'Actual Partner' ? 'شريك فعلي' :
                           p.classification === 'Potential' ? 'شريك محتمل' :
                           p.classification === 'Under Negotiation' ? 'قيد التفاوض' :
                           p.classification === 'Rejected' ? 'مرفوض' : 'غير محدد'}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                           {p.type === 'company' ? 'شركة' : p.type === 'university' ? 'جامعة' : p.type === 'school' ? 'مدرسة' : p.type === 'institution' ? 'مؤسسة' : p.type === 'donor' ? 'جهة طبية' : p.type === 'community' ? 'أفراد' : p.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <UserCircle2 size={16} className="text-slate-400" />
                        <div>
                          <div className="font-bold text-deepBlue">{p.contact_person || '—'}</div>
                          <div className="text-[10px] text-slate-500">{p.contact_position}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-customBlue">{p.assigned_to || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <Clock size={14} />
                        {formatDate(p.last_contact_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {p.phone && (
                          <a
                            href={`https://wa.me/${p.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition hover:bg-emerald-500 hover:text-white"
                            title="تواصل عبر واتساب"
                          >
                            <Phone size={14} />
                          </a>
                        )}
                        <button
                          onClick={() => handleEdit(p)}
                          className="flex h-8 px-3 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-600 transition hover:bg-slate-200"
                        >
                          عرض / تعديل
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PartnerCrmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => void loadData(activeTab)}
        editingPartner={editingPartner}
      />
    </div>
  )
}

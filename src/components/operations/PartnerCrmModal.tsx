import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save } from 'lucide-react'
import { createPartner, updatePartner } from '@/api/partnersApi'
import type { PartnerRecord } from '@/types/operations'

type PartnerCrmModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingPartner?: PartnerRecord | null
}

const defaultPartner = {
  name: '',
  type: 'company',
  project_scope: 'EMC_GENERAL',
  classification: 'Potential',
  field_of_work: '',
  contact_person: '',
  contact_position: '',
  phone: '',
  email: '',
  country: 'اليمن',
  city: '',
  website: '',
  assigned_to: '',
  status: 'active',
  rejection_reason: '',
  notes: '',
  first_contact_date: '',
  last_contact_date: ''
}

export default function PartnerCrmModal({ isOpen, onClose, onSuccess, editingPartner }: PartnerCrmModalProps) {
  const [formData, setFormData] = useState<Partial<PartnerRecord>>(defaultPartner)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (editingPartner) {
      setFormData({
        ...defaultPartner,
        ...editingPartner
      })
    } else {
      setFormData(defaultPartner)
    }
  }, [editingPartner, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingPartner?.id) {
        await updatePartner(editingPartner.id, formData)
      } else {
        await createPartner(formData)
      }
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" dir="rtl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/80 p-6 backdrop-blur-md">
            <div>
              <h2 className="text-xl font-black text-deepBlue">
                {editingPartner ? 'تعديل بيانات الشريك' : 'إضافة جهة / شريك جديد'}
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                إدارة ملف الشريك التعريفي وسجل التواصل
              </p>
            </div>
            <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            
            {/* Section 1: Basic Info */}
            <section className="space-y-4">
              <h3 className="text-sm font-black text-customBlue border-b border-customBlue/10 pb-2">1. البيانات التأسيسية للشريك</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-deepBlue">التابع للمشروع / المسار *</label>
                  <select
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                    value={formData.project_scope || 'EMC_GENERAL'}
                    onChange={e => setFormData({ ...formData, project_scope: e.target.value })}
                  >
                    <option value="EMC_GENERAL">عام (EMC)</option>
                    <option value="HACKATHON">الهاكاثون</option>
                    <option value="BOOTCAMP">المعسكر المهني</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-deepBlue">اسم الجهة / المنظمة *</label>
                  <input
                    required
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-deepBlue">نوع الجهة</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                    value={formData.type || 'company'}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="company">شركة</option>
                    <option value="university">جامعة / أكاديمي</option>
                    <option value="school">أكاديمية / مدرسة</option>
                    <option value="institution">مؤسسة / جمعية</option>
                    <option value="donor">جهة طبية / داعم</option>
                    <option value="community">أفراد / مجتمع</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-deepBlue">تصنيف الشراكة (Tier)</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                    value={formData.classification || 'Potential'}
                    onChange={e => setFormData({ ...formData, classification: e.target.value })}
                  >
                    <option value="Actual Partner">شريك فعلي</option>
                    <option value="Potential">شريك محتمل</option>
                    <option value="Under Negotiation">قيد التفاوض</option>
                    <option value="Rejected">مرفوض / متعثر</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-bold text-deepBlue">مجال العمل والنشاط</label>
                  <input
                    type="text"
                    placeholder="مثال: ذكاء اصطناعي، تدريب واستشارات..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                    value={formData.field_of_work || ''}
                    onChange={e => setFormData({ ...formData, field_of_work: e.target.value })}
                  />
                </div>
              </div>
            </section>

            {/* Section 2: Contact Info */}
            <section className="space-y-4">
              <h3 className="text-sm font-black text-customBlue border-b border-customBlue/10 pb-2">2. بيانات جهة الاتصال والتمثيل</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-deepBlue">اسم ممثل الجهة</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                    value={formData.contact_person || ''}
                    onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-deepBlue">المسمى / المنصب الوظيفي</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                    value={formData.contact_position || ''}
                    onChange={e => setFormData({ ...formData, contact_position: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-deepBlue">رقم الجوال / الواتساب</label>
                  <input
                    type="text"
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue text-right focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-deepBlue">البريد الإلكتروني</label>
                  <input
                    type="email"
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue text-right focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-deepBlue">الدولة</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                    value={formData.country || ''}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-deepBlue">المدينة</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                    value={formData.city || ''}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
              </div>
            </section>

            {/* Section 3: Follow-up & Management */}
            <section className="space-y-4">
              <h3 className="text-sm font-black text-customBlue border-b border-customBlue/10 pb-2">3. سجل المتابعة وإدارة التواصل</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-deepBlue">المسؤول عن التواصل (من EMC)</label>
                  <input
                    type="text"
                    placeholder="اسم المسؤول..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                    value={formData.assigned_to || ''}
                    onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">تاريخ أول تواصل</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                      value={formData.first_contact_date ? formData.first_contact_date.split('T')[0] : ''}
                      onChange={e => setFormData({ ...formData, first_contact_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">تاريخ آخر تواصل</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                      value={formData.last_contact_date ? formData.last_contact_date.split('T')[0] : ''}
                      onChange={e => setFormData({ ...formData, last_contact_date: e.target.value })}
                    />
                  </div>
                </div>
                {formData.classification === 'Rejected' && (
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-xs font-bold text-deepBlue">سبب الرفض أو التعثر</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-rose-50/50 px-4 py-3 text-sm font-medium text-rose-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                      value={formData.rejection_reason || ''}
                      onChange={e => setFormData({ ...formData, rejection_reason: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Section 4: Notes */}
            <section className="space-y-4">
              <h3 className="text-sm font-black text-customBlue border-b border-customBlue/10 pb-2">4. المخرجات والملاحظات الإضافية</h3>
              <div>
                <label className="mb-2 block text-xs font-bold text-deepBlue">ملاحظات الشراكة (شروط خاصة، مجالات التعاون...)</label>
                <textarea
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </section>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-customBlue px-6 py-2.5 text-sm font-black text-white hover:bg-customBlue/90 disabled:opacity-70"
              >
                <Save size={16} />
                {submitting ? 'جاري الحفظ...' : 'حفظ بيانات الشريك'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

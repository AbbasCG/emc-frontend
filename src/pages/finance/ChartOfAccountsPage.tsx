import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderTree,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  Loader2,
  X,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react'
import toast from '@/lib/toast'
import {
  fetchChartOfAccountsTree,
  fetchAccountsList,
  suggestAccountCode,
  createChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount,
  type ChartOfAccountItem,
} from '@/api/chartOfAccountsApi'

// ── TreeNode Component for recursive rendering ────────────────────────────────

interface TreeNodeProps {
  account: ChartOfAccountItem
  level?: number
  onAddChild: (parent: ChartOfAccountItem) => void
  onEdit: (account: ChartOfAccountItem) => void
  onDelete: (account: ChartOfAccountItem) => void
}

function TreeNode({ account, level = 0, onAddChild, onEdit, onDelete }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = (account.all_children && account.all_children.length > 0) || (account.children && account.children.length > 0)
  const children = account.all_children ?? account.children ?? []

  const isDebit = account.type === 'debit'

  return (
    <div className="flex flex-col">
      {/* Node Row */}
      <div
        className={`group relative flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all duration-200 ${
          level === 0
            ? 'border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 shadow-sm'
            : level === 1
            ? 'border-slate-100 bg-white hover:border-customBlue/30 hover:shadow-sm'
            : 'border-slate-100 bg-slate-50/50 hover:bg-white'
        }`}
        style={{ marginRight: `${level * 1.5}rem` }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Toggle expand button */}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-customBlue/10 hover:text-customBlue"
            >
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${expanded ? 'rotate-0' : '-rotate-90'}`}
              />
            </button>
          ) : (
            <span className="h-7 w-7 shrink-0 flex items-center justify-center text-slate-300">•</span>
          )}

          {/* Account Code Badge */}
          <span className="inline-flex shrink-0 items-center rounded-lg bg-deepBlue/5 px-2.5 py-1 font-latin text-xs font-black text-deepBlue">
            {account.code}
          </span>

          {/* Account Title & Subtitle */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-black text-deepBlue">{account.name_ar}</span>
              {account.name_en && (
                <span className="hidden text-xs font-semibold text-slate-400 font-latin sm:inline">
                  ({account.name_en})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Badges & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Type Badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              isDebit ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'
            }`}
          >
            {isDebit ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
            {isDebit ? 'مدين (Debit)' : 'دائن (Credit)'}
          </span>

          {/* Selectable / Main Tag */}
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
              account.is_selectable
                ? 'bg-sky-50 text-customBlue border border-sky-200/60'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {account.is_selectable ? 'فرعي (يقبل قيود)' : 'رئيسي (تجميعي)'}
          </span>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-90 transition-opacity group-hover:opacity-100">
            {!account.is_selectable && (
              <button
                type="button"
                onClick={() => onAddChild(account)}
                title="إضافة حساب فرعي"
                className="flex h-8 items-center gap-1 rounded-lg bg-customBlue/10 px-2.5 text-xs font-bold text-customBlue transition hover:bg-customBlue hover:text-white"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">فرعي</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onEdit(account)}
              title="تعديل الحساب"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-customBlue/40 hover:text-customBlue"
            >
              <Pencil size={14} />
            </button>

            <button
              type="button"
              onClick={() => onDelete(account)}
              title="حذف الحساب"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Recursive Children */}
      {expanded && hasChildren && (
        <div className="mt-2 space-y-2 border-r-2 border-slate-100 pr-2">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              account={child}
              level={level + 1}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function ChartOfAccountsPage() {
  const [tree, setTree] = useState<ChartOfAccountItem[]>([])
  const [flatAccounts, setFlatAccounts] = useState<ChartOfAccountItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  // Form states
  const [selectedParent, setSelectedParent] = useState<ChartOfAccountItem | null>(null)
  const [editingAccount, setEditingAccount] = useState<ChartOfAccountItem | null>(null)

  const [formCode, setFormCode] = useState('')
  const [formNameAr, setFormNameAr] = useState('')
  const [formNameEn, setFormNameEn] = useState('')
  const [formType, setFormType] = useState<'debit' | 'credit'>('debit')
  const [formIsSelectable, setFormIsSelectable] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [treeData, flatData] = await Promise.all([
        fetchChartOfAccountsTree(),
        fetchAccountsList(),
      ])
      setTree(treeData)
      setFlatAccounts(flatData)
    } catch {
      toast.error('تعذر تحميل شجرة الحسابات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Handle open create modal
  async function handleOpenCreate(parent?: ChartOfAccountItem) {
    setSelectedParent(parent ?? null)
    setFormNameAr('')
    setFormNameEn('')
    setFormIsSelectable(true)

    try {
      const res = await suggestAccountCode(parent?.id)
      setFormCode(res.suggested_code)
      setFormType(res.type ?? parent?.type ?? 'debit')
    } catch {
      setFormCode('')
      setFormType(parent?.type ?? 'debit')
    }
    setIsCreateOpen(true)
  }

  // Handle open edit modal
  function handleOpenEdit(account: ChartOfAccountItem) {
    setEditingAccount(account)
    setFormNameAr(account.name_ar)
    setFormNameEn(account.name_en ?? '')
    setFormIsSelectable(account.is_selectable)
    setIsEditOpen(true)
  }

  // Handle create submission
  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formCode.trim() || !formNameAr.trim()) {
      toast.error('يرجى ملء كافة الحقول المطلوبة')
      return
    }

    setSubmitting(true)
    try {
      await createChartOfAccount({
        code: formCode.trim(),
        name_ar: formNameAr.trim(),
        name_en: formNameEn.trim() || undefined,
        type: formType,
        parent_id: selectedParent?.id ?? null,
        is_selectable: formIsSelectable,
      })
      toast.success('تم إضافة الحساب المحاسبي بنجاح')
      setIsCreateOpen(false)
      await loadData()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'تعذر إضافة الحساب')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle edit submission
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingAccount || !formNameAr.trim()) return

    setSubmitting(true)
    try {
      await updateChartOfAccount(editingAccount.id, {
        name_ar: formNameAr.trim(),
        name_en: formNameEn.trim() || undefined,
        is_selectable: formIsSelectable,
      })
      toast.success('تم تحديث بيانات الحساب بنجاح')
      setIsEditOpen(false)
      await loadData()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'تعذر تحديث الحساب')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete
  async function handleDelete(account: ChartOfAccountItem) {
    if (!window.confirm(`هل أنت تأكد من رغبتك في حذف الحساب: (${account.code}) ${account.name_ar}؟`)) return

    try {
      await deleteChartOfAccount(account.id)
      toast.success('تم حذف الحساب بنجاح')
      await loadData()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'تعذر حذف الحساب')
    }
  }

  // Filter accounts when searching
  const filteredFlatAccounts = search.trim()
    ? flatAccounts.filter(
        (a) =>
          a.code.includes(search) ||
          a.name_ar.includes(search) ||
          (a.name_en && a.name_en.toLowerCase().includes(search.toLowerCase()))
      )
    : null

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-customBlue to-[#1B6489] text-white shadow-md">
            <FolderTree size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-deepBlue">شجرة الحسابات المحاسبية (Chart of Accounts)</h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              دليل ومخطط الهيكلية المحاسبية لمركز EMC — (أصول، التزامات، مصروفات، وإيرادات)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            title="تحديث البيانات"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-customBlue/30 hover:bg-slate-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreate()}
            className="flex h-11 items-center gap-2 rounded-2xl bg-customOrange px-5 text-xs font-extrabold text-white shadow-md transition hover:bg-customOrange/90"
          >
            <Plus size={18} />
            <span>حساب رئيسي جديد</span>
          </button>
        </div>
      </div>

      {/* Main Categories Summary Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { code: '1', title: 'الأصول (Assets)', type: 'debit', desc: 'متداولة، ثابتة، وغير ملموسة', color: 'from-[#0F6E99] to-[#1FA3DC]' },
          { code: '2', title: 'الالتزامات (Liabilities & Equity)', type: 'credit', desc: 'التزامات، رأس المال، والاحتياطي', color: 'from-[#073E58] to-[#0F6E99]' },
          { code: '3', title: 'المصروفات (Expenses)', type: 'debit', desc: 'رواتب، تقنية، ومصاريف تشغيلية', color: 'from-[#E07F00] to-[#F39200]' },
          { code: '4', title: 'الإيرادات (Revenues)', type: 'credit', desc: 'دورات، ورش، تمويل، ومبيعات', color: 'from-[#1488BC] to-[#52BFEA]' },
        ].map((cat) => (
          <div
            key={cat.code}
            className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-latin text-sm font-black text-customBlue">رمز {cat.code}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${cat.type === 'debit' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {cat.type === 'debit' ? 'مدين' : 'دائن'}
              </span>
            </div>
            <h3 className="mt-2 text-base font-black text-deepBlue">{cat.title}</h3>
            <p className="mt-1 text-xs text-slate-500">{cat.desc}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن حساب بالرمز أو الاسم بالعربية أو الإنجليزية..."
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white pr-11 pl-4 text-sm font-bold text-deepBlue outline-none transition focus:border-customBlue focus:ring-2 focus:ring-sky-100"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 size={32} className="animate-spin text-customBlue" />
            <p className="text-xs font-bold">جارٍ تحميل شجرة الحسابات المحاسبية...</p>
          </div>
        ) : filteredFlatAccounts ? (
          /* Search Results Display */
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-bold text-slate-500">نتائج البحث ({filteredFlatAccounts.length}):</span>
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-xs font-bold text-customBlue hover:underline"
              >
                إلغاء البحث والعودة للشجرة
              </button>
            </div>
            {filteredFlatAccounts.length === 0 ? (
              <p className="py-8 text-center text-xs font-bold text-slate-400">لا توجد حسابات تطابق خيار البحث</p>
            ) : (
              filteredFlatAccounts.map((acc) => (
                <TreeNode
                  key={acc.id}
                  account={acc}
                  onAddChild={handleOpenCreate}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        ) : (
          /* Tree View Display */
          <div className="space-y-4">
            {tree.map((rootAccount) => (
              <TreeNode
                key={rootAccount.id}
                account={rootAccount}
                onAddChild={handleOpenCreate}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <Plus className="text-customOrange" size={20} />
                  <h3 className="text-lg font-black text-deepBlue">
                    {selectedParent ? `إضافة حساب فرعي لـ (${selectedParent.code})` : 'إضافة حساب جديد'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4 text-right">
                {selectedParent && (
                  <div className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
                    الحساب الأب: <span className="text-deepBlue">{selectedParent.name_ar}</span> (كود: {selectedParent.code})
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-deepBlue">رمز الحساب (Code)</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="مثال: 3304"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-latin font-bold text-deepBlue outline-none focus:border-customBlue"
                  />
                  <span className="text-[10px] text-slate-400">تم التوليد التلقائي بناءً على التسلسل المحاسبي</span>
                </div>

                <div>
                  <label className="block text-xs font-black text-deepBlue">اسم الحساب بالعربية</label>
                  <input
                    type="text"
                    required
                    value={formNameAr}
                    onChange={(e) => setFormNameAr(e.target.value)}
                    placeholder="مثال: مصاريف التسويق والإعلانات"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-bold text-deepBlue outline-none focus:border-customBlue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-deepBlue">اسم الحساب بالإنجليزية (اختياري)</label>
                  <input
                    type="text"
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    placeholder="Marketing & Ads Expenses"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-latin font-bold text-deepBlue outline-none focus:border-customBlue"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-deepBlue">طبيعة الحساب</label>
                    <select
                      value={formType}
                      disabled={!!selectedParent}
                      onChange={(e) => setFormType(e.target.value as 'debit' | 'credit')}
                      className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-bold text-deepBlue outline-none disabled:bg-slate-100"
                    >
                      <option value="debit">مدين (Debit)</option>
                      <option value="credit">دائن (Credit)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-deepBlue">نوع الحساب</label>
                    <select
                      value={formIsSelectable ? '1' : '0'}
                      onChange={(e) => setFormIsSelectable(e.target.value === '1')}
                      className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-bold text-deepBlue outline-none"
                    >
                      <option value="1">فرعي (يقبل قيود)</option>
                      <option value="0">رئيسي (تجميعي)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="h-11 rounded-xl px-4 text-xs font-bold text-slate-500 hover:bg-slate-100"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-11 items-center gap-2 rounded-xl bg-customOrange px-6 text-xs font-extrabold text-white shadow-md hover:bg-customOrange/90 disabled:opacity-50"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    <span>حفظ الحساب</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditOpen && editingAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <Pencil className="text-customBlue" size={20} />
                  <h3 className="text-lg font-black text-deepBlue">تعديل الحساب المحاسبي ({editingAccount.code})</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="mt-5 space-y-4 text-right">
                <div>
                  <label className="block text-xs font-black text-deepBlue">اسم الحساب بالعربية</label>
                  <input
                    type="text"
                    required
                    value={formNameAr}
                    onChange={(e) => setFormNameAr(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-bold text-deepBlue outline-none focus:border-customBlue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-deepBlue">اسم الحساب بالإنجليزية (اختياري)</label>
                  <input
                    type="text"
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-latin font-bold text-deepBlue outline-none focus:border-customBlue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-deepBlue">نوع الحساب</label>
                  <select
                    value={formIsSelectable ? '1' : '0'}
                    onChange={(e) => setFormIsSelectable(e.target.value === '1')}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-bold text-deepBlue outline-none"
                  >
                    <option value="1">فرعي (يقبل قيود)</option>
                    <option value="0">رئيسي (تجميعي)</option>
                  </select>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="h-11 rounded-xl px-4 text-xs font-bold text-slate-500 hover:bg-slate-100"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-11 items-center gap-2 rounded-xl bg-customBlue px-6 text-xs font-extrabold text-white shadow-md hover:bg-customBlue/90 disabled:opacity-50"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    <span>حفظ التغييرات</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

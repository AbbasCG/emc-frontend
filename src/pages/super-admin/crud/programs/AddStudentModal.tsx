import { useEffect, useRef, useState } from 'react'
import { Check, Search, UserPlus, X } from 'lucide-react'
import toast from '@/lib/toast'
import { addStudentToCourse, type AddStudentPayload } from '@/api/adminCoursesApi'
import { searchAdminUsers, type UserSearchHit } from '@/api/adminUsersApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface Props {
  courseId: number
  courseTitle: string
  onClose: () => void
  onAdded: () => void
}

type Mode = 'existing' | 'new'

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

function initialsOf(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '?'
}

export function AddStudentModal({ courseId, courseTitle, onClose, onAdded }: Props) {
  const [mode, setMode]               = useState<Mode>('existing')
  const [loading, setLoading]         = useState(false)

  // ── Existing user search ───────────────────────────────────────────────
  const [searchQ, setSearchQ]         = useState('')
  const [results, setResults]         = useState<UserSearchHit[]>([])
  const [searching, setSearching]     = useState(false)
  const [selected, setSelected]       = useState<UserSearchHit | null>(null)
  const debouncedQ                    = useDebounce(searchQ, 300)
  const searchRef                     = useRef<HTMLInputElement>(null)
  const panelRef                      = useRef<HTMLDivElement>(null)

  useFocusTrap(panelRef, { active: true, onEscape: onClose })

  useEffect(() => {
    if (!debouncedQ.trim()) { setResults([]); return }
    setSearching(true)
    searchAdminUsers(debouncedQ)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setSearching(false))
  }, [debouncedQ])

  // ── New user fields ────────────────────────────────────────────────────
  const [email, setEmail]             = useState('')
  const [fullName, setFullName]       = useState('')
  const [phone, setPhone]             = useState('')
  const [status, setStatus]           = useState('registered')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload: AddStudentPayload = { status }

    if (mode === 'existing') {
      if (!selected) { toast.error('اختر طالبًا من نتائج البحث'); return }
      payload.user_id = selected.id
    } else {
      if (!email.trim())    { toast.error('البريد الإلكتروني مطلوب'); return }
      if (!fullName.trim()) { toast.error('الاسم الكامل مطلوب'); return }
      payload.email     = email.trim()
      payload.full_name = fullName.trim()
      if (phone.trim()) payload.phone = phone.trim()
    }

    setLoading(true)
    try {
      await addStudentToCourse(courseId, payload)
      toast.success('تم إضافة الطالب للدورة')
      onAdded()
      onClose()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  function selectUser(u: UserSearchHit) {
    setSelected(u)
    setResults([])
    setSearchQ('')
  }

  function clearSelected() {
    setSelected(null)
    setSearchQ('')
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-student-modal-title"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#0F172A] px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <UserPlus className="size-5 text-[#2691C2]" aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50">إضافة طالب</p>
              <p id="add-student-modal-title" className="truncate text-sm font-black">{courseTitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-1.5 hover:bg-white/10 transition">
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50">
          {(['existing', 'new'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={[
                'flex-1 py-2.5 text-[11px] font-black transition',
                mode === m
                  ? 'border-b-2 border-[#2691C2] bg-white text-[#0F172A]'
                  : 'text-slate-400 hover:text-slate-600',
              ].join(' ')}
            >
              {m === 'existing' ? 'مستخدم موجود' : 'إنشاء طالب جديد'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          {mode === 'existing' ? (
            <div className="space-y-3">
              {/* Selected user pill */}
              {selected ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
                  <Avatar user={selected} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-emerald-800">{selected.name}</p>
                    <p className="truncate text-[11px] font-semibold text-emerald-600 dir-ltr">{selected.email}</p>
                    {selected.phone && <p className="truncate text-[10px] font-semibold text-emerald-500 dir-ltr">{selected.phone}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Check className="size-4 text-emerald-600" />
                    <button type="button" onClick={clearSelected} className="rounded-lg p-1 hover:bg-emerald-100 transition">
                      <X className="size-3.5 text-emerald-600" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-[#2691C2] focus-within:ring-2 focus-within:ring-[#2691C2]/20 transition">
                    <Search className="size-4 shrink-0 text-slate-400" aria-hidden />
                    <input
                      ref={searchRef}
                      autoFocus
                      type="text"
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      placeholder="ابحث بالاسم أو البريد أو الهاتف…"
                      className="flex-1 bg-transparent text-sm font-semibold text-right text-[#0F172A] outline-none placeholder:text-slate-400"
                    />
                    {searching && (
                      <div className="size-4 shrink-0 animate-spin rounded-full border-2 border-[#2691C2] border-t-transparent" />
                    )}
                  </div>

                  {/* Results dropdown */}
                  {results.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                      {results.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            onClick={() => selectUser(u)}
                            className="flex w-full items-center gap-3 px-3.5 py-2.5 text-right transition hover:bg-slate-50"
                          >
                            <Avatar user={u} size={32} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-[#0F172A]">{u.name}</p>
                              <p className="truncate text-[11px] font-semibold text-slate-500 dir-ltr">{u.email}</p>
                              {u.phone && <p className="truncate text-[10px] font-semibold text-slate-400 dir-ltr">{u.phone}</p>}
                            </div>
                            <span className="shrink-0 font-mono text-[9px] text-slate-300">#{u.id}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {searchQ.trim() && !searching && results.length === 0 && (
                    <p className="mt-2 text-center text-[11px] font-semibold text-slate-400">لا نتائج — جرّب كلمة أخرى</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <Field label="البريد الإلكتروني" required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  dir="ltr"
                  className={inputCls}
                />
              </Field>
              <Field label="الاسم الكامل" required>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="محمد أحمد"
                  className={inputCls + ' text-right'}
                />
              </Field>
              <Field label="رقم الهاتف">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+966xxxxxxxxx"
                  dir="ltr"
                  className={inputCls}
                />
              </Field>
            </>
          )}

          <Field label="حالة التسجيل">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputCls + ' text-right'}
            >
              <option value="registered">مسجل (registered)</option>
              <option value="payment_confirmed">مؤكد الدفع (payment_confirmed)</option>
              <option value="attended">حضر (attended)</option>
            </select>
          </Field>

          <div className="flex gap-2.5 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-[#0F172A] py-2.5 text-sm font-black text-white transition hover:bg-[#2691C2] disabled:opacity-50"
            >
              {loading ? 'جار الإضافة…' : 'إضافة الطالب'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50 transition"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold focus:border-[#2691C2] focus:outline-none focus:ring-2 focus:ring-[#2691C2]/20 transition'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-black text-slate-700">
        {label}
        {required && <span className="mr-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function Avatar({ user, size }: { user: UserSearchHit; size: number }) {
  const [imgFailed, setImgFailed] = useState(false)
  const s = `${size}px`
  if (user.avatar && !imgFailed) {
    return (
      <img
        src={user.avatar}
        alt=""
        style={{ width: s, height: s }}
        className="shrink-0 rounded-xl object-cover"
        onError={() => setImgFailed(true)}
      />
    )
  }
  return (
    <div
      style={{ width: s, height: s }}
      className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-bl from-[#22334A] to-[#2691C2] text-[11px] font-black text-white"
    >
      {initialsOf(user.name)}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

  const [searchQ, setSearchQ]         = useState('')
  const [results, setResults]         = useState<UserSearchHit[]>([])
  const [searching, setSearching]     = useState(false)
  const [selected, setSelected]       = useState<UserSearchHit | null>(null)
  const debouncedQ                    = useDebounce(searchQ, 300)
  const searchRef                     = useRef<HTMLInputElement>(null)
  const panelRef                      = useRef<HTMLDivElement>(null)

  useFocusTrap(panelRef, { active: true, onEscape: onClose })

  // Re-arm the search state during render when the debounced term changes
  // (react.dev "adjusting state when a prop changes") — the previous hits stay on
  // screen while the new request is in flight, exactly as before.
  const [seenQ, setSeenQ] = useState(debouncedQ)
  if (seenQ !== debouncedQ) {
    setSeenQ(debouncedQ)
    if (debouncedQ.trim()) {
      setSearching(true)
    } else {
      setResults([])
      setSearching(false)
    }
  }

  useEffect(() => {
    if (!debouncedQ.trim()) return
    let alive = true
    void (async () => {
      try {
        const hits = await searchAdminUsers(debouncedQ)
        if (alive) setResults(hits)
      } catch {
        if (alive) setResults([])
      } finally {
        if (alive) setSearching(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [debouncedQ])

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

  // ESC closes only this modal — capture + stopImmediatePropagation beats the drawer listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        role="presentation"
        aria-hidden
        className="fixed inset-0 z-nested-modal-backdrop bg-[#0F172A]/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="add-student-modal-title"
        dir="rtl"
        className="pointer-events-none fixed inset-0 z-nested-modal flex items-center justify-center p-4"
      >
        <div
          ref={panelRef}
          className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-[#0F172A] px-5 py-4 text-white">
            <div className="flex items-center gap-2.5">
              <UserPlus className="size-5 text-[#0077B6]" aria-hidden />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">إضافة طالب</p>
                <p id="add-student-modal-title" className="truncate text-sm font-black">{courseTitle}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-1.5 transition hover:bg-white/10">
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="flex border-b border-slate-100 bg-slate-50">
            {(['existing', 'new'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={[
                  'flex-1 py-2.5 text-[11px] font-black transition',
                  mode === m
                    ? 'border-b-2 border-[#0077B6] bg-white text-[#0F172A]'
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
                      <button type="button" onClick={clearSelected} className="rounded-lg p-1 transition hover:bg-emerald-100">
                        <X className="size-3.5 text-emerald-600" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition focus-within:border-[#0077B6] focus-within:ring-2 focus-within:ring-[#0077B6]/20">
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
                        <div className="size-4 shrink-0 animate-spin rounded-full border-2 border-[#0077B6] border-t-transparent" />
                      )}
                    </div>

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
                className="flex-1 rounded-xl bg-[#0F172A] py-2.5 text-sm font-black text-white transition hover:bg-[#0077B6] disabled:opacity-50"
              >
                {loading ? 'جار الإضافة…' : 'إضافة الطالب'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body,
  )
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold transition focus:border-[#0077B6] focus:outline-none focus:ring-2 focus:ring-[#0077B6]/20'

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
      className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-bl from-[#0C2A4B] to-[#0077B6] text-[11px] font-black text-white"
    >
      {initialsOf(user.name)}
    </div>
  )
}

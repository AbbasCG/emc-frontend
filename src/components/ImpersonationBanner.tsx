import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { motion } from 'framer-motion'
import { ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { getApiErrorMessage } from '@/api/apiErrors'
import { getUserRoleLabel } from '@/utils/userIdentity'

/**
 * Visible during super-admin impersonation — must stay obvious that the session is a preview shell.
 */
export default function ImpersonationBanner() {
  const navigate = useNavigate()
  const { user, impersonationOriginalUser, isImpersonating, stopImpersonationPreview } = useAuth()
  const [busy, setBusy] = useState(false)

  if (!isImpersonating || !impersonationOriginalUser || !user) return null

  const roleLbl = getUserRoleLabel(user) || String(user.role ?? '')

  async function onStop() {
    setBusy(true)
    try {
      await stopImpersonationPreview()
      toast.success('تم إنهاء وضع المعاينة.')
      navigate('/dashboard/super-admin', { replace: true })
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        toast.warning('لا تملك صلاحية تنفيذ هذا الإجراء')
      } else {
        toast.error(getApiErrorMessage(e))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-auto sticky top-16 z-[45] mx-auto mb-4 w-full max-w-[1600px] px-0"
      dir="rtl"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-amber-400/95 bg-gradient-to-bl from-amber-200/95 via-amber-100/95 to-orange-50/95 px-4 py-3 text-deepBlue shadow-[0_22px_50px_-20px_rgba(180,83,9,0.55)] ring-4 ring-white/95 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/95 text-amber-900 shadow-inner ring-1 ring-amber-300/70">
            <ShieldAlert className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1 text-right rtl:text-right">
            <p className="text-[13px] font-black leading-snug">
              أنت الآن تتصفح المنصّة كمستخدم آخر
            </p>
            <p className="text-[12px] font-bold leading-relaxed text-deepBlue/90">
              وضع المعاينة مفعّل — أنت تعرض المنصّة كما يراها هذا المستخدم.
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-black text-deepBlue/75">
              <span className="truncate">
                المعاينة كـ:&nbsp;<span className="text-deepBlue">{user.name}</span>{' '}
                <span className="rounded-lg bg-white/85 px-1.5 py-0.5 font-latin">{roleLbl}</span>
              </span>
              <span className="hidden h-4 w-px bg-deepBlue/20 sm:inline" aria-hidden />
              <span className="truncate text-[11px] font-semibold">
                حساب سوبر مشرف المرجعي:&nbsp;
                <span className="font-black">{impersonationOriginalUser.name}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 sm:justify-start">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onStop()}
            className="inline-flex items-center justify-center rounded-2xl bg-[#22334A] px-5 py-2.5 text-[12px] font-black text-white shadow-lg transition hover:bg-deepBlue disabled:opacity-55"
          >
            {busy ? 'جاري الإنهاء…' : 'إنهاء المعاينة'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

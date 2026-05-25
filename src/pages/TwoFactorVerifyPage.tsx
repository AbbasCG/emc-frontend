import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Smartphone, KeyRound, AlertCircle } from 'lucide-react'
import { EmcButton } from '@/components/ui'
import { verifyTwoFactorLogin } from '@/api/twoFactorApi'

export default function TwoFactorVerifyPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const userId = Number(params.get('user_id') ?? '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!userId) {
      navigate('/login', { replace: true })
    }
  }, [userId, navigate])

  const handleVerify = async () => {
    if (code.length !== 6 || !userId) return
    setBusy(true)
    setError('')
    try {
      const result = await verifyTwoFactorLogin(userId, code)
      localStorage.setItem('token', result.token)
      localStorage.setItem('role', result.role)
      localStorage.setItem('user', JSON.stringify(result.user))
      navigate('/dashboard', { replace: true })
    } catch {
      setError('رمز التحقق غير صحيح. حاول مرة أخرى.')
    } finally {
      setBusy(false)
    }
  }

  const handleBackup = async () => {
    if (code.length < 10 || !userId) return
    setBusy(true)
    setError('')
    try {
      const result = await verifyTwoFactorLogin(userId, code)
      localStorage.setItem('token', result.token)
      localStorage.setItem('role', result.role)
      localStorage.setItem('user', JSON.stringify(result.user))
      navigate('/dashboard', { replace: true })
    } catch {
      setError('رمز الطوارئ غير صحيح أو تم استخدامه من قبل.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-bl from-[#0F172A] to-[#22334A] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-customBlue/10">
          <Smartphone size={32} className="text-customBlue" />
        </div>

        <h1 className="text-2xl font-black text-deepBlue">التحقق الثنائي</h1>
        <p className="mt-2 text-sm text-slate-500">
          أدخل رمز التحقق المكون من 6 أرقام من تطبيق المصادقة، أو أحد رموز الطوارئ.
        </p>

        <div className="mt-8">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\s/g, '').slice(0, 20))}
            className="w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-center text-2xl font-mono font-bold text-deepBlue tracking-[0.3em] focus:outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/10"
            placeholder="000000"
            dir="ltr"
            autoFocus
          />
          <p className="mt-2 text-[11px] text-slate-400">
            أدخل 6 أرقام لكود التطبيق، أو كود الطوارئ (10 أحرف) لتسجيل الدخول.
          </p>
          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-700">
              <AlertCircle size={12} />
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <EmcButton
            variant="primary"
            size="lg"
            className="w-full"
            onClick={code.length === 6 ? handleVerify : handleBackup}
            disabled={busy || code.length < 6}
            leadingIcon={code.length === 6 ? <Smartphone size={16} /> : <KeyRound size={16} />}
          >
            {busy ? 'جاري التحقق...' : code.length === 6 ? 'تحقق' : 'استخدام كود الطوارئ'}
          </EmcButton>

          <button
            onClick={() => {
              localStorage.removeItem('token')
              navigate('/login', { replace: true })
            }}
            className="text-xs font-bold text-slate-500 hover:text-customBlue transition-colors"
          >
            رجوع إلى تسجيل الدخول
          </button>
        </div>
      </div>
    </div>
  )
}

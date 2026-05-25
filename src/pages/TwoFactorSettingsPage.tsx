import { useEffect, useState } from 'react'
import { Shield, ShieldOff, Copy, Check, Eye, EyeOff, Smartphone } from 'lucide-react'
import { DashboardPageShell, EmcButton, Eyebrow, Surface } from '@/components/ui'
import {
  fetchTwoFactorStatus,
  generateTwoFactorSecret,
  enableTwoFactor,
  disableTwoFactor,
} from '@/api/twoFactorApi'

export default function TwoFactorSettingsPage() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [setup, setSetup] = useState<{
    step: 'generate' | 'verify' | 'backup' | 'done'
    secret?: string
    qrCodeUrl?: string
    backupCodes?: string[]
  }>({ step: 'done' })
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [disableError, setDisableError] = useState('')
  const [copied, setCopied] = useState<number | null>(null)
  const [showBackup, setShowBackup] = useState(false)

  const loadStatus = () => {
    fetchTwoFactorStatus().then((s) => {
      setIsEnabled(s.is_enabled)
      if (s.is_enabled) setSetup({ step: 'done' })
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadStatus() }, [])

  const handleGenerate = async () => {
    try {
      const data = await generateTwoFactorSecret()
      setSetup({ step: 'generate', secret: data.secret, qrCodeUrl: data.qr_code_url })
    } catch {
      setVerifyError('فشل إنشاء المفتاح. حاول مرة أخرى.')
    }
  }

  const handleEnable = async () => {
    setVerifyError('')
    try {
      const data = await enableTwoFactor(verifyCode)
      setSetup({ step: 'backup', backupCodes: data.backup_codes })
      setIsEnabled(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors?.code?.[0]
      setVerifyError(msg || 'الكود غير صحيح. حاول مرة أخرى.')
    }
  }

  const handleDisable = async () => {
    setDisableError('')
    try {
      await disableTwoFactor(disablePassword)
      setIsEnabled(false)
      setSetup({ step: 'done' })
      setDisablePassword('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors?.password?.[0]
      setDisableError(msg || 'كلمة المرور غير صحيحة.')
    }
  }

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return <DashboardPageShell title="التحقق الثنائي" eyebrow={<Eyebrow tone="accent">SECURITY</Eyebrow>} description=""> </DashboardPageShell>
  }

  return (
    <DashboardPageShell
      title="التحقق الثنائي (2FA)"
      eyebrow={<Eyebrow tone="accent">SECURITY · 2FA</Eyebrow>}
      description="أضف طبقة حماية إضافية لحسابك باستخدام تطبيق مصادقة."
      badge={
        isEnabled
          ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200"><Shield size={12} /> مفعّل</span>
          : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 ring-1 ring-amber-200"><ShieldOff size={12} /> غير مفعّل</span>
      }
    >
      {!isEnabled && setup.step === 'done' && (
        <Surface variant="default" elevation={3} padding="lg" className="text-center">
          <ShieldOff size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-black text-deepBlue">التحقق الثنائي غير مفعّل</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            فعّل التحقق الثنائي لحماية حسابك. ستحتاج إلى تطبيق مصادقة مثل Google Authenticator أو Microsoft Authenticator.
          </p>
          <div className="mt-6">
            <EmcButton variant="primary" size="md" onClick={handleGenerate} leadingIcon={<Shield size={16} />}>
              تفعيل التحقق الثنائي
            </EmcButton>
          </div>
        </Surface>
      )}

      {setup.step === 'generate' && setup.qrCodeUrl && (
        <Surface variant="default" elevation={3} padding="lg" className="text-center">
          <Smartphone size={32} className="mx-auto text-customBlue mb-4" />
          <h3 className="text-lg font-black text-deepBlue">امسح رمز QR</h3>
          <p className="mt-2 text-sm text-slate-500">
            استخدم تطبيق المصادقة لمسح رمز QR أدناه، ثم أدخل الكود المكون من 6 أرقام للتحقق.
          </p>
          <div className="my-6 flex justify-center">
            <img
              src={setup.qrCodeUrl}
              alt="QR Code for 2FA"
              className="rounded-xl border border-slate-200 p-2 bg-white"
              style={{ width: 200, height: 200 }}
            />
          </div>

          <div className="text-center mb-4">
            <p className="text-xs font-bold text-slate-500 mb-2">أو أدخل المفتاح يدوياً:</p>
            <code className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-mono text-deepBlue select-all">
              {setup.secret}
            </code>
          </div>

          <div className="max-w-xs mx-auto">
            <label className="block text-xs font-bold text-slate-600 mb-1 text-right">كود التحقق (6 أرقام)</label>
            <input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-lg font-mono font-bold text-deepBlue tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-customBlue/20"
              placeholder="000000"
              maxLength={6}
              dir="ltr"
            />
            {verifyError && <p className="text-xs text-red-600 mt-1 text-right">{verifyError}</p>}
          </div>

          <div className="flex items-center justify-center gap-3 mt-6">
            <EmcButton variant="primary" size="sm" onClick={handleEnable} disabled={verifyCode.length !== 6}>
              تحقق وتفعيل
            </EmcButton>
            <EmcButton variant="secondary" size="sm" onClick={() => setSetup({ step: 'done' })}>
              إلغاء
            </EmcButton>
          </div>
        </Surface>
      )}

      {setup.step === 'backup' && setup.backupCodes && (
        <Surface variant="default" elevation={3} padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <Check size={24} className="text-emerald-500" />
            <div>
              <h3 className="text-lg font-black text-deepBlue">تم تفعيل التحقق الثنائي!</h3>
              <p className="text-sm text-slate-500">احتفظ برموز الطوارئ هذه في مكان آمن. يمكن استخدامها لمرة واحدة فقط إذا فقدت الوصول إلى تطبيق المصادقة.</p>
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-4">
            <button
              onClick={() => setShowBackup(!showBackup)}
              className="flex items-center gap-2 text-sm font-bold text-amber-800"
            >
              {showBackup ? <EyeOff size={14} /> : <Eye size={14} />}
              {showBackup ? 'إخفاء الرموز' : 'عرض رموز الطوارئ'}
            </button>

            {showBackup && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {setup.backupCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 font-mono text-sm text-deepBlue"
                  >
                    <span>{code.match(/.{1,5}/g)?.join('-')}</span>
                    <button
                      onClick={() => copyToClipboard(code, idx)}
                      className="text-slate-400 hover:text-customBlue transition-colors"
                    >
                      {copied === idx ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <EmcButton variant="primary" size="sm" onClick={() => setSetup({ step: 'done' })}>
              تم
            </EmcButton>
          </div>
        </Surface>
      )}

      {isEnabled && setup.step === 'done' && (
        <Surface variant="default" elevation={3} padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={24} className="text-emerald-500" />
            <div>
              <h3 className="text-lg font-black text-deepBlue">التحقق الثنائي مفعّل</h3>
              <p className="text-sm text-slate-500">حسابك محمي بطبقة إضافية من الأمان.</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4">
            <h4 className="text-sm font-black text-deepBlue mb-3">تعطيل التحقق الثنائي</h4>
            <p className="text-xs text-slate-500 mb-3">يجب إدخال كلمة المرور لتعطيل 2FA.</p>
            <div className="max-w-xs">
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20"
                placeholder="كلمة المرور"
              />
              {disableError && <p className="text-xs text-red-600 mt-1">{disableError}</p>}
            </div>
            <div className="mt-3">
              <EmcButton
                variant="danger"
                size="sm"
                onClick={handleDisable}
                disabled={!disablePassword}
                leadingIcon={<ShieldOff size={14} />}
              >
                تعطيل
              </EmcButton>
            </div>
          </div>
        </Surface>
      )}
    </DashboardPageShell>
  )
}

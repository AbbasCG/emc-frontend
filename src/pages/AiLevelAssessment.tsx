import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  BadgePercent,
  Check,
  Copy,
  Gauge,
  Link2,
  Send,
  Share2,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import apiClient from '@/api/axios'
import { unwrapData } from '@/api/unwrap'
import PublicSeo from '@/components/public/PublicSeo'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { trackFunnelEvent } from '@/lib/funnelEvents'
import {
  DIMENSIONS,
  FIELD_QUESTION,
  GOAL_QUESTION,
  LEVELS,
  QUESTIONS,
  buildShareText,
  computeResult,
  recommendPlan,
  type AssessmentLevel,
  type DimensionKey,
} from '@/data/aiAssessment'

/**
 * «اختبر مستواك في AI» — تجربة تسويقية تعليمية كاملة (EMC AI Level Assessment):
 * زائر ← تقييم ← نتيجة شخصية قابلة للمشاركة ← توصية ← مكافأة 7% ← رحلة تعلم.
 * سؤال واحد في كل شاشة، بلا حساب، والنتيجة لا تُحجب خلف نموذج بيانات.
 */

type Stage = 'intro' | 'quiz' | 'result'

const ASSESSMENT_PATH = '/ai-level'

type RewardInfo = { reward_code: string; reward_percent: number; reward_expires_at: string }

async function submitResult(payload: Record<string, unknown>): Promise<RewardInfo | null> {
  try {
    const res = await apiClient.post<unknown>('/ai-assessment/results', payload, { skipErrorToast: true })
    return unwrapData<RewardInfo>(res.data)
  } catch {
    return null
  }
}

function DimensionBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-bold text-ink-600">{label}</span>
        <span dir="ltr" className="font-black tabular-nums text-deepBlue">{value}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            value >= 70 ? 'bg-emerald-500' : value >= 45 ? 'bg-customBlue' : 'bg-amber-400'
          }`}
          style={{ width: `${Math.max(3, value)}%` }}
        />
      </div>
    </div>
  )
}

export default function AiLevelAssessment() {
  const [searchParams] = useSearchParams()
  const fromFriend = searchParams.get('ref') != null

  const [stage, setStage] = useState<Stage>('intro')
  const [stepIndex, setStepIndex] = useState(0)
  const [goal, setGoal] = useState<string | null>(null)
  const [field, setField] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [reward, setReward] = useState<RewardInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [lead, setLead] = useState({ name: '', email: '', whatsapp: '' })
  const [leadSent, setLeadSent] = useState(false)
  const [leadBusy, setLeadBusy] = useState(false)

  // خط سير الأسئلة: هدف ← مجال ← 15 سؤالاً موزوناً
  const steps = useMemo(() => [GOAL_QUESTION, FIELD_QUESTION, ...QUESTIONS] as const, [])
  const totalSteps = steps.length
  const current = steps[stepIndex]

  const result = useMemo(
    () => (stage === 'result' ? computeResult(answers) : null),
    [stage, answers],
  )

  const shareUrl = `${window.location.origin}${ASSESSMENT_PATH}?ref=1`

  function start() {
    setStage('quiz')
    setStepIndex(0)
    trackFunnelEvent('ai_assessment_start', { from_friend: fromFriend })
  }

  async function finish(finalAnswers: Record<string, number>) {
    const computed = computeResult(finalAnswers)
    setStage('result')
    trackFunnelEvent('ai_assessment_complete', {
      level: computed.level.id,
      overall: computed.overall,
      goal: goal ?? undefined,
      field: field ?? undefined,
    })
    const saved = await submitResult({
      visitor_id: localStorage.getItem('emc_visitor_id') ?? undefined,
      level_id: computed.level.id,
      level_title: computed.level.title,
      overall: computed.overall,
      scores: computed.scores,
      goal,
      field,
      ref: searchParams.get('ref') ?? undefined,
    })
    if (saved) setReward(saved)
  }

  function answer(value: string | number) {
    if (current.id === 'goal') setGoal(String(value))
    else if (current.id === 'field') setField(String(value))
    else setAnswers((a) => ({ ...a, [current.id]: Number(value) }))

    if (stepIndex + 1 >= totalSteps) {
      const finalAnswers =
        current.id === 'goal' || current.id === 'field'
          ? answers
          : { ...answers, [current.id]: Number(value) }
      void finish(finalAnswers)
    } else {
      // انتقال تلقائي بعد الاختيار
      window.setTimeout(() => setStepIndex((i) => i + 1), 180)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      trackFunnelEvent('ai_assessment_share', { channel: 'copy' })
    } catch {
      toast.error('تعذر النسخ — انسخ الرابط يدوياً')
    }
  }

  function share(channel: 'whatsapp' | 'linkedin' | 'x' | 'native') {
    if (!result) return
    const text = buildShareText(result.level.title, result.level.titleEn, result.level.order, shareUrl)
    trackFunnelEvent('ai_assessment_share', { channel, level: result.level.id })
    if (channel === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    } else if (channel === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener')
    } else if (channel === 'x') {
      window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    } else if (navigator.share) {
      void navigator.share({ title: 'EMC AI Level Assessment', text, url: shareUrl }).catch(() => undefined)
    }
  }

  async function sendLead() {
    if (!reward || !lead.email.trim()) {
      toast.error('البريد الإلكتروني لازم لإرسال التقرير')
      return
    }
    setLeadBusy(true)
    const ok = await submitResult({
      reward_code: reward.reward_code,
      level_id: result?.level.id,
      level_title: result?.level.title,
      overall: result?.overall,
      scores: result?.scores,
      name: lead.name.trim() || undefined,
      email: lead.email.trim(),
      whatsapp: lead.whatsapp.trim() || undefined,
    })
    setLeadBusy(false)
    if (ok !== null) {
      setLeadSent(true)
      toast.success('حُفظ تقريرك — سنرسل خطتك إلى بريدك')
    } else {
      toast.error('تعذر الحفظ الآن')
    }
  }

  const strengths = result
    ? DIMENSIONS.filter((d) => result.scores[d.key] >= 65).map((d) => d.label)
    : []
  const gaps = result
    ? DIMENSIONS.filter((d) => result.scores[d.key] < 50).map((d) => d.label)
    : []
  const nextLevel: AssessmentLevel | null = result
    ? (LEVELS.find((l) => l.order === result.level.order + 1) ?? null)
    : null
  const plan = result ? recommendPlan(result.level.id, goal) : null

  return (
    <div className="bg-paper pt-20" dir="rtl">
      <PublicSeo
        title="اختبر مستواك في AI"
        description="15 سؤالاً و3 دقائق ونتيجة فورية: اكتشف مستواك في الذكاء الاصطناعي واحصل على خطتك التالية مع EMC."
        path={ASSESSMENT_PATH}
      />

      {/* ── البداية ── */}
      {stage === 'intro' && (
        <section className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
          {fromFriend && (
            <p className="mb-6 rounded-xl bg-sky/40 px-4 py-2.5 text-sm font-bold text-deepBlue">
              صديقك اكتشف مستواه في AI — الآن دورك.
            </p>
          )}
          <p className="emc-eyebrow">
            <Gauge className="h-3.5 w-3.5" aria-hidden />
            EMC AI Level Assessment
          </p>
          <h1 className="emc-title-arc is-center mt-4 font-display text-4xl font-black tracking-tight text-deepBlue sm:text-5xl">
            أين أنت في عالم AI؟
          </h1>
          <p className="mt-5 max-w-md text-base leading-8 text-ink-500">
            اكتشف أين أنت الآن، وما خطوتك التالية. لا تحتاج إلى تعلم كل شيء في
            الذكاء الاصطناعي — تحتاج أولاً إلى معرفة مستواك، ثم اختيار الخطوة الصحيحة.
          </p>
          <p className="mt-6 text-sm font-black text-ink-400">15 سؤالاً · 3 دقائق · نتيجة فورية</p>
          <button
            onClick={start}
            className="emc-focus-ring mt-8 inline-flex h-14 items-center gap-2.5 rounded-2xl bg-customOrange px-10 text-base font-extrabold text-white transition hover:bg-ember"
          >
            اختبر مستواك
            <ArrowLeftIcon size={18} />
          </button>
          <p className="mt-4 text-xs font-bold text-ink-300">بلا تسجيل — النتيجة تظهر فوراً</p>
        </section>
      )}

      {/* ── الأسئلة: سؤال واحد في كل شاشة ── */}
      {stage === 'quiz' && (
        <section className="mx-auto max-w-xl px-4 py-14 sm:px-6">
          {/* شريط التقدم */}
          <div className="mb-2 flex items-baseline justify-between text-[11px] font-black text-ink-400">
            <span>سؤال {stepIndex + 1} من {totalSteps}</span>
            <span dir="ltr" className="tabular-nums">{Math.round(((stepIndex + 1) / totalSteps) * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-customBlue transition-all duration-300"
              style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 14 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="mt-9"
            >
              <h2 className="font-display text-xl font-black leading-9 text-deepBlue sm:text-2xl">
                {current.text}
              </h2>
              <div className="mt-6 grid gap-2.5">
                {current.options.map((opt) => {
                  const value = 'value' in opt ? opt.value : opt.score
                  const selected =
                    current.id === 'goal'
                      ? goal === value
                      : current.id === 'field'
                        ? field === value
                        : answers[current.id] === value
                  return (
                    <button
                      key={opt.label}
                      onClick={() => answer(value)}
                      className={`rounded-2xl border px-5 py-4 text-start text-[15px] font-bold transition-colors duration-150 ${
                        selected
                          ? 'border-customBlue bg-sky/40 text-deepBlue'
                          : 'border-line bg-white text-ink-600 hover:border-customBlue/50 hover:bg-sky/20'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              {stepIndex > 0 && (
                <button
                  onClick={() => setStepIndex((i) => i - 1)}
                  className="mt-6 inline-flex items-center gap-1.5 text-xs font-black text-ink-400 transition hover:text-deepBlue"
                >
                  <ArrowRight size={13} aria-hidden />
                  السؤال السابق
                </button>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      )}

      {/* ── النتيجة ── */}
      {stage === 'result' && result && plan && (
        <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
          {/* بطاقة النتيجة القابلة للمشاركة */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden rounded-3xl bg-gradient-to-br from-deepBlue via-navy to-ocean p-8 text-center text-white sm:p-10"
          >
            <p className="font-latin text-[11px] font-black tracking-[0.2em] text-ice/70">
              EMC · AI LEVEL ASSESSMENT
            </p>
            <p className="mt-5 text-sm font-bold text-ice/80">مستواك في عالم الذكاء الاصطناعي</p>
            <h1 className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">
              {result.level.title}
            </h1>
            <p className="font-latin mt-1 text-sm font-bold text-ice/70">{result.level.titleEn}</p>
            <p dir="ltr" className="emc-stat-num mt-6 text-6xl text-white">
              {result.overall}<span className="text-2xl text-ice/60"> / 100</span>
            </p>
            <p className="mt-3 inline-flex rounded-full bg-white/10 px-4 py-1.5 text-xs font-black tracking-wide">
              المستوى {result.level.order} من 5
            </p>
            <p className="font-latin mt-6 text-[11px] font-bold text-ice/50">edumc.nl{ASSESSMENT_PATH}</p>
          </motion.div>

          <p className="mx-auto mt-6 max-w-lg text-center text-sm leading-8 text-ink-500">
            {result.level.message}
          </p>

          {/* المشاركة */}
          <div className="mt-8 rounded-2xl border border-line bg-white p-6 text-center">
            <h2 className="flex items-center justify-center gap-2 font-display text-lg font-black text-deepBlue">
              <Share2 size={17} className="text-customBlue" aria-hidden />
              شارك مستواك
            </h2>
            <p className="mt-2 text-xs leading-6 text-ink-400">
              شارك نتيجتك مع أصدقائك واكتشفوا من وصل إلى أعلى مستوى في عالم AI.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button onClick={() => share('whatsapp')} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-emerald-600">
                WhatsApp
              </button>
              <button onClick={() => share('linkedin')} className="rounded-xl bg-customBlue px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-brand-600">
                LinkedIn
              </button>
              <button onClick={() => share('x')} className="rounded-xl bg-deepBlue px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-night">
                X
              </button>
              <button onClick={() => void copyLink()} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-xs font-extrabold text-deepBlue transition hover:border-customBlue">
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                {copied ? 'نُسخ' : 'نسخ الرابط'}
              </button>
            </div>
            <p className="mt-5 border-t border-line pt-4 text-sm font-black text-deepBlue">تحدَّ أصدقاءك</p>
            <p className="mt-1 text-xs leading-6 text-ink-400">
              أرسل لهم الاختبار واعرفوا أين يقف كل واحد منكم في رحلة الذكاء الاصطناعي.
            </p>
            <button
              onClick={() => void copyLink()}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-customBlue/40 px-5 py-2.5 text-xs font-extrabold text-customBlue transition hover:bg-sky/30"
            >
              <Link2 size={13} aria-hidden />
              ادعُ صديقاً للاختبار
            </button>
          </div>

          {/* التحليل التفصيلي */}
          <div className="mt-6 rounded-2xl border border-line bg-white p-6">
            <h2 className="font-display text-lg font-black text-deepBlue">تحليل نتيجتك</h2>
            <div className="mt-5 space-y-4">
              {DIMENSIONS.map((d) => (
                <DimensionBar key={d.key} label={d.label} value={result.scores[d.key as DimensionKey]} />
              ))}
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {strengths.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-emerald-600">أنت قوي في</h3>
                  <ul className="mt-2 space-y-1.5">
                    {strengths.map((s) => (
                      <li key={s} className="flex items-center gap-2 text-sm font-bold text-ink-600">
                        <BadgeCheck size={14} className="shrink-0 text-emerald-500" aria-hidden />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {gaps.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-amber-600">تحتاج إلى تطوير</h3>
                  <ul className="mt-2 space-y-1.5">
                    {gaps.map((g) => (
                      <li key={g} className="flex items-center gap-2 text-sm font-bold text-ink-600">
                        <Sparkles size={14} className="shrink-0 text-amber-500" aria-hidden />
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {nextLevel && (
              <p className="mt-6 border-t border-line pt-4 text-sm leading-7 text-ink-500">
                مستواك التالي: <span className="font-black text-deepBlue">{nextLevel.title}</span>
                <span className="font-latin text-xs font-bold text-ink-400"> — {nextLevel.titleEn}</span>
              </p>
            )}
          </div>

          {/* الخطة الشخصية */}
          <div className="mt-6 rounded-2xl border border-line bg-white p-6">
            <h2 className="font-display text-lg font-black text-deepBlue">خطوتك التالية</h2>
            <ol className="mt-4 space-y-3">
              {[
                { label: 'ابدأ الآن', value: plan.now },
                { label: 'بعدها', value: plan.next },
                { label: 'هدفك', value: plan.target },
              ].map((step, i) => (
                <li key={step.label} className="flex items-center gap-4 rounded-xl bg-paper2/60 px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-deepBlue text-xs font-black text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[10px] font-black tracking-[0.14em] text-ink-400">{step.label}</p>
                    <p className="text-sm font-black text-deepBlue">{step.value}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* المكافأة */}
          <div className="mt-6 rounded-2xl border-2 border-customOrange/60 bg-white p-6 text-center">
            <p className="inline-flex items-center gap-2 text-xs font-black tracking-wide text-customOrange">
              <BadgePercent size={15} aria-hidden />
              مكافأة اكتشاف مستواك
            </p>
            <p className="mt-3 text-sm leading-7 text-ink-500">
              لأنك أكملت تقييم EMC لمهارات الذكاء الاصطناعي، حصلت على:
            </p>
            <p className="mt-2 font-display text-4xl font-black text-deepBlue">
              خصم 7%
            </p>
            <p className="mt-1 text-xs font-bold text-ink-400">
              على البرامج المقترحة لك في هذه النتيجة · صالح لمدة 72 ساعة
            </p>
            {reward ? (
              <p dir="ltr" className="mx-auto mt-4 w-fit rounded-xl border border-dashed border-customOrange/50 bg-paper2/50 px-5 py-2.5 font-latin text-lg font-black tracking-widest text-deepBlue">
                {reward.reward_code}
              </p>
            ) : (
              <p className="mt-4 text-xs font-bold text-ink-300">جارٍ إصدار كود المكافأة…</p>
            )}
            <Link
              to="/courses"
              onClick={() => trackFunnelEvent('ai_assessment_reward_claim', { level: result.level.id })}
              className="mt-5 inline-flex h-12 items-center gap-2 rounded-xl bg-customOrange px-8 text-sm font-extrabold text-white transition hover:bg-ember"
            >
              استخدم مكافأتي
              <ArrowLeftIcon size={15} />
            </Link>
          </div>

          {/* حفظ التقرير (اختياري — بعد النتيجة لا قبلها) */}
          <div className="mt-6 rounded-2xl border border-line bg-white p-6">
            <h2 className="font-display text-lg font-black text-deepBlue">احفظ تقريرك الكامل وخطة التعلم</h2>
            {leadSent ? (
              <p className="mt-3 flex items-center gap-2 text-sm font-bold text-emerald-600">
                <BadgeCheck size={16} aria-hidden />
                حُفظ تقريرك — سنرسل النتيجة والخطة إلى بريدك.
              </p>
            ) : (
              <>
                <p className="mt-2 text-xs leading-6 text-ink-400">
                  اختياري تماماً — نتيجتك ظاهرة أعلاه بكل الأحوال.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <input
                    value={lead.name}
                    onChange={(e) => setLead((l) => ({ ...l, name: e.target.value }))}
                    placeholder="الاسم"
                    className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue"
                  />
                  <input
                    dir="ltr"
                    type="email"
                    value={lead.email}
                    onChange={(e) => setLead((l) => ({ ...l, email: e.target.value }))}
                    placeholder="البريد الإلكتروني"
                    className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue"
                  />
                  <input
                    dir="ltr"
                    value={lead.whatsapp}
                    onChange={(e) => setLead((l) => ({ ...l, whatsapp: e.target.value }))}
                    placeholder="واتساب (اختياري)"
                    className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue"
                  />
                </div>
                <button
                  disabled={leadBusy}
                  onClick={() => void sendLead()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-deepBlue px-6 py-2.5 text-xs font-extrabold text-white transition hover:bg-night disabled:opacity-60"
                >
                  <Send size={13} aria-hidden />
                  {leadBusy ? 'جارٍ الحفظ…' : 'أرسل لي النتيجة وخطتي'}
                </button>
              </>
            )}
          </div>

          <p className="mt-10 text-center">
            <span className="font-display text-lg font-black text-deepBlue">اعرف مستواك. ابدأ خطوتك التالية.</span>
          </p>
        </section>
      )}
    </div>
  )
}

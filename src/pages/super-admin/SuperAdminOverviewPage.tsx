import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BadgeCheck,
  BarChart4,
  BookMarked,
  Building2,
  ClipboardList,
  Crown,
  FileSignature,
  HeartHandshake,
  Landmark,
  LifeBuoy,
  Megaphone,
  Rows3,
  Scale,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserCog,
  UserRoundPen,
  Users,
  WalletCards,
  Waypoints,
} from 'lucide-react'
import { SUPER_ADMIN_CRUD_COUNT } from './superAdminEntities'

function overviewCards() {
  return [
  {
    tag: 'تشغيل شامل',
    title: 'جميع الوحدات الآن قابلة للوصول تحت هذا الدور الواحد مع حوافز تنقل فورية.',
    description:
      'يُمكن للسوبر مشرف إدارة المالية، الموارد البشرية، الشراكة، المحتوى، والدعم في نفس الجلسة دون احتراب الأدوار.',
    icon: Crown,
    tone: 'from-customBlue/[0.12] via-white to-brand-400/[0.16]',
    border: 'border-customBlue/[0.12]',
    iconBg: 'from-customBlue/18 to-transparent',
    iconFg: '#1f3fad',
    iconRing: '#1f3fad66',
    iconShadow:
      '0 18px 40px rgba(15,61,146,0.18), inset 0 1px rgba(255,255,255,0.7)',
    href: '#mission',
    ctaLabel: 'ماذا تغير؟',
    stat: '+32 مسار خدمات',
    statLabel: 'مُدمَجة في نقطة واحدة',
  },
  {
    tag: 'تجربة مشرفة',
    title: 'لوحة CRUD جاهزة لكل كيان حرج، مع نفس جدول الأعمال على الخادم.',
    description:
      'المستخدمون، الأدوار، الطلاب، المدربون، البرامج، المسارات، الورش، والتسجيلات تتبع نمط موحّد للقائمة والتفاصيل والإنشاء.',
    icon: Rows3,
    tone: 'from-brand-500/[0.16] via-white to-emerald-300/[0.18]',
    border: 'border-brand-300/40',
    iconBg: 'from-brand-500/25 to-transparent',
    iconFg: '#0f6b4c',
    iconRing: '#0f6b4c55',
    iconShadow:
      '0 18px 40px rgba(15,107,76,0.18), inset 0 1px rgba(255,255,255,0.7)',
    href: '/dashboard/super-admin/crud/users',
    ctaLabel: 'افتح CRUD',
    stat: `${SUPER_ADMIN_CRUD_COUNT} كيانات`,
    statLabel: 'قابلة للتوسيع',
  },
  {
    tag: 'أمان عالٍ',
    title: 'لا حواجز RoleGate على السوبر مشرف، مع بقاء الأدوار الأخرى معزولة.',
    description:
      'يُسمح لـ super_admin بكل مسارات لوحة القيادة، بينما تحتفظ الأدوار المهنية بسياسات الوصول المعتادة.',
    icon: ShieldCheck,
    tone: 'from-amber-200/40 via-white to-slate-200/40',
    border: 'border-amber-200/50',
    iconBg: 'from-amber-400/30 to-transparent',
    iconFg: '#b45309',
    iconRing: '#b4530944',
    iconShadow:
      '0 18px 40px rgba(180,83,9,0.18), inset 0 1px rgba(255,255,255,0.7)',
    href: '/dashboard/super-admin/crud/roles',
    ctaLabel: 'إدارة الأدوار',
    stat: 'Bypass آمن',
    statLabel: 'RoleGate + قواعد المسار',
  },
  ] as const
}

const quickLinks = [
  { label: 'المستخدمون', href: '/dashboard/super-admin/crud/users', icon: Users },
  { label: 'الأدوار', href: '/dashboard/super-admin/crud/roles', icon: ShieldCheck },
  { label: 'الإدارات', href: '/dashboard/super-admin/crud/departments', icon: Building2 },
  { label: 'الفريق', href: '/dashboard/super-admin/crud/team', icon: UserCheck },
  { label: 'الطلاب', href: '/dashboard/super-admin/crud/students', icon: UserRoundPen },
  { label: 'المدربون', href: '/dashboard/super-admin/crud/instructors', icon: UserCog },
  { label: 'البرامج', href: '/dashboard/super-admin/crud/programs', icon: BookMarked },
  { label: 'المسارات', href: '/dashboard/super-admin/crud/tracks', icon: Waypoints },
  { label: 'الورش', href: '/dashboard/super-admin/crud/workshops', icon: Sparkles },
  { label: 'التسجيلات', href: '/dashboard/super-admin/crud/registrations', icon: FileSignature },
  { label: 'الشراكات', href: '/dashboard/super-admin/crud/partners', icon: Landmark },
  { label: 'عمليات الشراكة', href: '/dashboard/admin/partnership-requests', icon: HeartHandshake },
  { label: 'المدفوعات', href: '/dashboard/finance/payments', icon: WalletCards },
  { label: 'الموارد البشرية', href: '/dashboard/hr', icon: BadgeCheck },
  { label: 'المهام والتشغيل', href: '/dashboard/admin/tasks', icon: ClipboardList },
  { label: 'الإعدادات', href: '/dashboard/settings/notifications', icon: Settings2 },
] as const

export default function SuperAdminOverviewPage() {
  return (
    <div dir="rtl" className="space-y-10">
      <header className="relative overflow-hidden rounded-[32px] border border-customBlue/10 bg-gradient-to-br from-white via-white to-customBlue/[0.05] p-8 shadow-[0_18px_60px_rgba(15,61,146,0.08)] sm:p-10">
        <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-customBlue/[0.12] blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-30%] right-[-10%] h-64 w-64 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="text-right">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-customBlue/70">Super Admin</p>
            <h1 className="mt-3 text-3xl font-black text-deepBlue sm:text-4xl">لوحة التحكم الشاملة</h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600">
              مركز قيادة EMC: نفس الحساب يفتح المالية، الموارد البشرية، التسويق، الشراكة، الجودة، والدعم دون تنازلات في
              التجربة أو الأمان على الأدوار الأخرى.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/dashboard/admin"
                className="rounded-2xl bg-customBlue px-5 py-2.5 text-[12px] font-black text-white shadow-[0_12px_30px_rgba(15,61,146,0.25)] hover:bg-deepBlue transition-colors"
              >
                مساحة الإدارة العامة
              </Link>
              <Link
                to="/dashboard/executive"
                className="rounded-2xl border border-deepBlue/[0.12] bg-white/80 px-5 py-2.5 text-[12px] font-black text-deepBlue hover:bg-slate-50 transition-colors backdrop-blur"
              >
                الصفحة التنفيذية
              </Link>
              <Link
                to="/dashboard/finance"
                className="rounded-2xl border border-deepBlue/[0.12] bg-white/70 px-5 py-2.5 text-[12px] font-black text-deepBlue hover:bg-slate-50 transition-colors backdrop-blur"
              >
                مركز التمويل
              </Link>
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="rounded-3xl border border-deepBlue/[0.08] bg-white/90 px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur">
              <p className="text-[11px] font-black text-slate-500">مؤشرات لحظية</p>
              <div className="mt-3 grid grid-cols-2 gap-4 text-right">
                <div>
                  <p className="text-2xl font-black text-deepBlue">∞</p>
                  <p className="text-[11px] font-bold text-slate-500">وصول كامل</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-brand-700">{SUPER_ADMIN_CRUD_COUNT}</p>
                  <p className="text-[11px] font-bold text-slate-500">كيانات CRUD</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-customBlue">12+</p>
                  <p className="text-[11px] font-bold text-slate-500">لوحات مساندة</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-amber-700">0</p>
                  <p className="text-[11px] font-bold text-slate-500">حواجز RoleGate</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      <section id="mission" className="grid gap-6 lg:grid-cols-3">
        {overviewCards().map((card) => {
          const Icon = card.icon
          return (
            <motion.article
              key={card.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
              className={`relative overflow-hidden rounded-[28px] border ${card.border} bg-gradient-to-br ${card.tone} p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-right">
                  <p className="text-[11px] font-black text-customBlue/80">{card.tag}</p>
                  <h3 className="mt-2 text-lg font-black text-deepBlue">{card.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">{card.description}</p>
                </div>
                <div
                  className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${card.iconBg} ring-1`}
                  style={{ boxShadow: card.iconShadow, borderColor: card.iconRing }}
                >
                  <Icon className="h-6 w-6" style={{ color: card.iconFg }} aria-hidden />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/70 pt-4">
                <div className="text-right">
                  <p className="text-[22px] font-black text-deepBlue">{card.stat}</p>
                  <p className="text-[11px] font-bold text-slate-500">{card.statLabel}</p>
                </div>
                <Link
                  to={card.href}
                  className="rounded-2xl bg-white/85 px-4 py-2 text-[12px] font-black text-deepBlue shadow-inner shadow-black/5 ring-1 ring-deepBlue/[0.08] hover:bg-white transition-colors"
                >
                  {card.ctaLabel}
                </Link>
              </div>
            </motion.article>
          )
        })}
      </section>

      <section className="rounded-[28px] border border-deepBlue/[0.08] bg-white/95 p-6 shadow-[0_14px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-deepBlue/[0.06] pb-5">
          <div className="text-right">
            <p className="text-[11px] font-black text-customBlue/80">رحلة السوبر مشرف</p>
            <h2 className="text-xl font-black text-deepBlue">وصول مختصر إلى الكيانات واللوحات</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              اختر البوابة الصحيحة دون المرور بحواجز الأدوار؛ تبقى الحساسية على حسابات أقل امتيازاً.
            </p>
          </div>
          <Link
            to="/dashboard/profile"
            className="rounded-2xl border border-deepBlue/[0.1] px-4 py-2 text-[11px] font-black text-deepBlue hover:bg-slate-50 transition-colors"
          >
            ملفي الشخصي
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href + link.label}
                to={link.href}
                className="group flex items-center gap-3 rounded-2xl border border-deepBlue/[0.06] bg-gradient-to-br from-white to-slate-50/70 px-4 py-3 text-right shadow-sm transition-colors hover:border-customBlue/30 hover:bg-white"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-customBlue/[0.08] text-customBlue ring-1 ring-customBlue/15">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-[13px] font-black text-deepBlue group-hover:text-customBlue">{link.label}</span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-deepBlue/[0.08] bg-white/95 p-6 shadow-[0_14px_50px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3 border-b border-deepBlue/[0.06] pb-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-200/70">
                <Megaphone className="h-5 w-5" aria-hidden />
              </div>
              <div className="text-right">
                <p className="text-[13px] font-black text-deepBlue">التسويق والجودة والدعم</p>
                <p className="text-[11px] font-bold text-slate-600">ثلاث نقاط تنفيذ لمخاطبة الجمهور وضبط المعايير والاستجابة.</p>
              </div>
            </div>
            <BadgeCheck className="h-5 w-5 text-emerald-600" aria-hidden />
          </div>
          <div className="mt-4 grid gap-3">
            <Link to="/dashboard/marketing" className="rounded-2xl border border-deepBlue/[0.06] px-4 py-3 text-right hover:border-customBlue/30 transition-colors">
              <p className="text-[12px] font-black text-deepBlue">التسويق والإعلام</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-600">خطط الحملات، المواد البصرية، وتتبّع الانطباع العام.</p>
            </Link>
            <Link to="/dashboard/quality" className="rounded-2xl border border-deepBlue/[0.06] px-4 py-3 text-right hover:border-customBlue/30 transition-colors">
              <p className="text-[12px] font-black text-deepBlue">الجودة والحوكمة</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-600">مراجعة المخرجات، التدقيق، وربط KPIs المعتمدة.</p>
            </Link>
            <Link to="/dashboard/support" className="rounded-2xl border border-deepBlue/[0.06] px-4 py-3 text-right hover:border-customBlue/30 transition-colors">
              <p className="text-[12px] font-black text-deepBlue">الدعم الفني</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-600">تذاكر، SLA، وحوكمة الاستجابة للمستخدمين.</p>
            </Link>
          </div>
        </div>

        <div className="rounded-[28px] border border-deepBlue/[0.08] bg-white/95 p-6 shadow-[0_14px_50px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3 border-b border-deepBlue/[0.06] pb-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500/14 text-brand-900 ring-1 ring-brand-200">
                <BarChart4 className="h-5 w-5" aria-hidden />
              </div>
              <div className="text-right">
                <p className="text-[13px] font-black text-deepBlue">البيانات والتقارير</p>
                <p className="text-[11px] font-bold text-slate-600">ربط KPIs المتعددة بلوحات قائمة ومُسبَقة التهيئة.</p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <Link to="/dashboard/admin/reports" className="rounded-2xl border border-deepBlue/[0.06] px-4 py-3 text-right hover:border-customBlue/30 transition-colors">
              <p className="text-[12px] font-black text-deepBlue">التقارير والتحليلات</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-600">مخططات قابلة للتصدير وفلاتر الزمن لمختلف الفرق.</p>
            </Link>
            <Link to="/dashboard/finance" className="rounded-2xl border border-deepBlue/[0.06] px-4 py-3 text-right hover:border-customBlue/30 transition-colors">
              <p className="text-[12px] font-black text-deepBlue">مالية وتقارير عائد</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-600">مزامنة KPIs المحاسبية مع تدفّق التسجيلات.</p>
            </Link>
            <Link to="/dashboard/department" className="rounded-2xl border border-deepBlue/[0.06] px-4 py-3 text-right hover:border-customBlue/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-black text-deepBlue">مساحة الإدارات</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-600">مزامنة الملفات اليومية لكل وحدة أكاديمية.</p>
                </div>
                <Building2 className="mt-1 h-5 w-5 text-deepBlue flex-shrink-0" aria-hidden />
              </div>
            </Link>
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-deepBlue/[0.08] bg-slate-50/70 px-6 py-4 text-[11px] font-bold text-slate-600">
        <span className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-slate-500" aria-hidden />
          كل طلب خارج مسار السوبر مشرف يحترم سياسات الـ JWT الحالية؛ تحديث الواجهة لا يؤثر على المصادقة.
        </span>
        <Link to="/dashboard/volunteer" className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-1.5 text-deepBlue shadow-sm ring-1 ring-deepBlue/[0.08] hover:bg-slate-50 transition-colors">
          <HeartHandshake className="h-4 w-4" aria-hidden />
          مساحة المتطوعين
        </Link>
        <Link to="/dashboard/support" className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-1.5 text-deepBlue shadow-sm ring-1 ring-deepBlue/[0.08] hover:bg-slate-50 transition-colors">
          <LifeBuoy className="h-4 w-4" aria-hidden />
          اتصال دعم المنصّة
        </Link>
      </footer>
    </div>
  )
}

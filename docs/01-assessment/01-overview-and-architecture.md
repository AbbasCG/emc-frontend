# التقرير ‎#01 — نظرة عامة والمعمارية

تقرير تقييمي يقدّم نموذجاً ذهنياً دقيقاً لواجهة EMC الأمامية: ماهيتها، حجمها الحقيقي، حزمتها التقنية، بنيتها، نظام التوجيه (routing)، التخطيطات (layouts)، شجرة المزوّدات (providers)، والمصادقة والتحكم بالصلاحيات حسب الدور.

آخر تحديث: 2026-06-21 · الفرع: dev

---

## 1. ما هي EMC وما الذي تقوم به هذه الواجهة الأمامية

**EMC** منصّة تعليمية عالمية موجّهة إلى الطلاب والمهاجرين والباحثين عن تغيير مساراتهم المهنية. تقدّم خدمات: دورات لغوية (EN/NL/AR)، استشارات تعليمية، إرشاد جامعي، مراجعة السير الذاتية والتدريب المهني، وتدريب تقني (AI / Data Science / Marketing / Project Management).

هذا المستودع (`C:\EMC\WEP`، الفرع `dev`) هو **الواجهة الأمامية فقط** (React SPA). الخادم منفصل تماماً: **Laravel REST API** يُقرأ عنوانه الافتراضي من `http://127.0.0.1:8000/api`. الواجهة **عربية أولاً (Arabic-first) و RTL** بالكامل.

> ملاحظة مهمة عن مصدر الحقيقة: الفرع `main` كان مجرد سقالة Vite فارغة؛ التطبيق الحقيقي يعيش على الفرع `dev`. كل ما في هذا التقرير مبنيّ على الفرع `dev` (تدقيق 2026-06-21).

ما يغطّيه التطبيق فعلياً (ليس سقالات): نظام LMS متكامل (واجبات + تسليمات + مراجعة، جلسات بمنطق نافذة انضمام، حضور بقفل على الخادم، تقييم شفهي بمعايير rubric، اختبارات تحديد مستوى، مسارات تعلّم عامة/طالب/مدرّب)، تقويم بعروض شهري/أسبوعي/يومي/قائمة مع تصدير ICS، تدفّق تسجيل ودفع متعدد المزوّدات (stripe/paypal/fake)، لوحات إدارية ومالية، ولوحات تحكّم بالأدوار. لا توجد علامات `TODO/stub/coming-soon` للميزات غير المكتملة عبر شريحة LMS بأكملها.

---

## 2. الحجم الحقيقي (SCALE)

| المقياس | القيمة |
|---|---|
| ملفات المصدر في `src/` | **752 ملفاً** (570 `.tsx` + 181 `.ts`) |
| إجمالي الأسطر | **‎~107,716 LOC** |
| نطاقات المكوّنات (`components/`) | ‎~30 نطاقاً فرعياً |
| نطاقات الصفحات (`pages/`) | ‎~18 نطاقاً |
| ملفات طبقة الـ API (`src/api`) | 72 ملفاً، ‎~11,334 LOC، 365 دالة مُصدَّرة |
| ملفات الأدوات (`src/utils`) | 42 ملفاً |
| الـ hooks المخصصة (`src/hooks`) | ملفان فقط |
| الـ contexts | ملفان (`AuthContext`, `CookieConsentContext`) |
| ملفات الاختبار | 4 ملفات، 54 اختباراً (كلها تمر) |
| `lazy()` (تقسيم بالمسار) | 182 استدعاءً |

🟢 **هذا تطبيق ناضج وكبير الحجم فعلاً**، وليس نموذجاً أولياً. النضج حقيقي، والدَّيْن التقني حقيقي أيضاً؛ هذا التقرير يقرّ بالأمرين بصدق.

أكبر الملفات (مؤشّر على «ملفات ضخمة» تحتاج تقسيماً لاحقاً): `pages/Courses/CourseContentManagerPage` ‎1801 LOC، `api/placementApi.ts` ‎1575، `pages/.../StudentCourseLearnPage` ‎1213، `api/studentApi.ts` ‎1291، `layouts/DashboardLayout.tsx` ‎740، `src/App.tsx` ‎611.

---

## 3. الحزمة التقنية (مع دور كل مكتبة)

| المكتبة / الإصدار | الدور في التطبيق |
|---|---|
| **Vite 8** | أداة البناء وخادم التطوير (بناء نظيف في ‎~2.24s) |
| **React 19.2** | إطار الواجهة |
| **TypeScript 6.0** | الأنواع (يُترجم نظيفاً عبر `tsc -b`) |
| **React Router 7.14** | التوجيه — جدول مسارات مركزي في `src/App.tsx` |
| **Tailwind 3.4** | التصميم بالـ utilities + طبقة tokens غنية |
| **framer-motion 12** | الحركة والانتقالات (مستخدمة في 311 ملفاً) |
| **axios 1.15** | عميل HTTP موحّد مع interceptors (`src/api/axios.ts`) |
| **@sentry/react 10.57** | تتبّع الأخطاء (يُحمَّل فقط عند ضبط `VITE_SENTRY_DSN`) |
| **recharts 3.8** | المخططات في اللوحات المالية و HR |
| **react-select 5.10** | عناصر اختيار متقدّمة |
| **react-helmet-async 3** | وسوم الرأس / SEO (`PublicSeo`) |
| **dompurify 3.4** | تعقيم HTML قبل `dangerouslySetInnerHTML` (مُستخدَمة فعلاً في 3 مواضع) |
| **react-hot-toast 2.6** | تنبيهات toast (المستخدَمة فعلياً) |
| **sonner 2** | مكتبة toast ثانية — **غير مستخدمة في `src/` (0 استيراد)** 🟡 |
| **pdf-lib 1.17** | توليد PDF (مُحمَّلة ديناميكياً فقط عند الحاجة) |
| **libphonenumber-js / i18n-iso-countries** | تحقّق الهاتف وأسماء الدول |
| **browser-image-compression** | ضغط الصور في المتصفّح (`compressImage.ts`) |
| **clsx + tailwind-merge** | الدالة `cn()` لدمج الأصناف (مستخدمة في ‎~77 ملفاً) |
| **lucide-react** | الأيقونات |
| **vitest 4 + Testing Library + jsdom** | بنية الاختبار (مهيّأة وجاهزة، لكن التغطية رقيقة) |
| **sharp + svgo + vite-plugin-image-optimizer** | تحسين الصور عند البناء |
| **eslint 10 (flat) + typescript-eslint 8** | الفحص الساكن (lint يفشل حالياً — انظر التقارير اللاحقة) |
| **`"i": "^0.3.7"`** | 🟡 **تبعية خردة** (مكتبة Node لتصريف الكلمات، 0 استيراد) — على الأرجح خطأ `npm i` مطبعي، يجب حذفها بـ `npm uninstall i` |

ملاحظات بيئة (`.env.example`): يقرأ axios كلاً من `VITE_API_URL` و `VITE_API_BASE_URL`؛ يوجد `VITE_APP_ENV`، `VITE_SENTRY_DSN`، علم ميزة `VITE_LMS_MODULE_REORDER`، و `VITE_GA_MEASUREMENT_ID` / `VITE_META_PIXEL_ID` (التحليلات تُحمَّل بعد موافقة الكوكيز فقط — خصوصية جيدة 🟢). 🟡 ثغرة صغيرة: `VITE_WHATSAPP_COMMUNITY_URL` يحوي رابط دعوة WhatsApp حقيقياً مع مسافتين بادئتين.

---

## 4. بنية `src/`

```
src/
├── api/         72 ملفاً — طبقة API يدوية على نسخة axios واحدة مشتركة
├── assets/      أصول ثابتة
├── components/  ~30 نطاقاً فرعياً (انظر أدناه)
├── contexts/    AuthContext, CookieConsentContext
├── data/        بيانات ثابتة (legal/*، impactDashboard، teamData)
├── hooks/       ملفان فقط (useStudentDashboardData، shim)
├── layouts/     Layout (عام) + DashboardLayout + PartnerLayout (ميت)
├── lib/         utils (cn)، toast، cookieConsent، impersonationSession
├── pages/       ~18 نطاقاً، ~229 صفحة
├── services/    ملفان (coursesApi، teamApi)
├── test/        4 ملفات اختبار
├── types/       12 ملفاً — أنواع المجال
└── utils/       42 ملفاً — أدوات نقية مُحكمة
```

**نطاقات `components/`:** ai, calendar, contact, dashboard, departments, emc-form-wizard, enrollment, enterprise, errors, feedback, finance, forms, home, hr, impact, instructor, intelligence, learning-paths, legal, lms, nav, operations, payments, platform, public, sections, shared, super-admin, team, tracks, ui, volunteer.

**نطاقات `pages/`:** admin, calendar, Courses, dashboard, errors, hr, intelligence, LearningPaths, legal, lms, manager-dashboards, operations, platform, Programs, settings, super-admin, tech-admin, Workshops.

---

## 5. خريطة التوجيه (Routing)

`src/App.tsx` (‎611 سطراً) هو جدول `<Routes>` مركزي واحد يضم **‎~350 مدخل `<Route>`** مع **‎~190 استيراد `React.lazy()`** و **61 موضع `Suspense`**.

شجرة المزوّدات الفعلية كما في `main.tsx` و `App.tsx`:

```
StrictMode
└─ HelmetProvider
   └─ App
      └─ ErrorBoundary
         └─ CookieConsentProvider
            └─ BrowserRouter
               ├─ ScrollToTop
               ├─ AppToaster
               ├─ AuthProvider
               │  └─ Routes  (≈350 مساراً)
               ├─ CookieBanner
               └─ CookiePreferencesModal
```

`main.tsx` يستدعي `validateEnv()` و `initSentry()` قبل الـ render.

### المسارات العامة مقابل المحميّة

| الفئة | التحميل | الحراسة |
|---|---|---|
| الصفحات الحرجة العامة (Home, Login, ForgotPassword, ResetPassword, NotFound) | **eager** (5 صفحات فقط) | لا تتطلب مصادقة |
| باقي الصفحات العامة (About, Courses, Programs, Workshops…) | `lazy` | لا تتطلب مصادقة |
| شجرة `/dashboard/*` (‎~152 مساراً) | `lazy` | `ProtectedRoute` + `DashboardAccessGuard` |

مساعِدات التوجيه: `RoleRedirect` يوجّه `/dashboard` إلى `getDashboardPathByRole(user?.role)`؛ ومسارات الـ alias تعيد توجيه عناوين مختصرة (`/admin/*`, `/partner/*`) إلى المسار القانوني `/dashboard/*`، إضافةً إلى توجيهات قديمة/عربية.

---

## 6. التخطيطات (Layouts)

| التخطيط | الملف | الدور |
|---|---|---|
| العام | `components/Layout.tsx` | Navbar + Footer، RTL، skip-link، fade عبر framer |
| لوحة التحكم | `layouts/DashboardLayout.tsx` (‎740 سطراً) | Sidebar + Topbar + CommandPalette + NotificationDrawer، شريط جانبي مدفوع بالدور، استطلاع إشعارات |
| 🟡 الشريك (ميت) | `layouts/PartnerLayout.tsx` | **مُصدَّر لكن غير مستورَد في أي مكان** — كود ميت؛ مسارات الشريك تُعرَض داخل `DashboardLayout` المشترك. يُحذف أو يُوصَل |

---

## 7. المصادقة والتحكم بالصلاحيات حسب الدور (RBAC)

هذه أقوى شريحة معمارية في التطبيق.

### نموذج المصادقة — `contexts/AuthContext.tsx` (‎284 سطراً)

- يخزّن الـ token وكائن المستخدم في **localStorage** (المفاتيح `emc_token` / `emc_user`).
- ترطيب عند الإقلاع عبر `/auth/me`، مع `login` / `register` / `logout` / `refreshUser`.
- يدعم **انتحال هوية super-admin** كاملاً (start/stop مع نسخة احتياطية في `sessionStorage` واستعادة).

### محرك الصلاحيات — `src/utils/dashboardAccess.ts` (‎256 سطراً)

| العنصر | التفصيل |
|---|---|
| `EMC_DASHBOARD_ROLES` | **20 دوراً** (الفرع `dev`): student, instructor, admin, super_admin, tech_admin, executive_admin, finance_manager, quality_manager, hr_manager, partner, marketing_manager, support_agent, volunteer, department_manager, programs_manager, operations_manager, partnerships_manager, community_manager, section_lead |
| `ROLE_ALIASES` | تطبيع انحراف الـ API: `teacher→instructor`، `superadmin→super_admin`، `finance→finance_manager`، `hr→hr_manager`… |
| `DASHBOARD_NAMESPACE_RULES` | قواعد مرتّبة **بالبادئة الأطول أولاً** (longest-prefix-wins) |
| الدوال | `getDashboardPathByRole`, `getAllowedRolesForPath`, `canAccessDashboardPath`, `getPostLoginRedirect` |
| God-mode | اختصار صريح لـ `super_admin` / `tech_admin` |

هذا المحرك مغطّى باختبار وحدة (`dashboardAccess.test.ts`، 19 اختباراً). 🟢

### الأدوار الخمسة الرئيسية وكيف تُوجّه

| الدور | المسار الرئيسي (`ROLE_HOME`) |
|---|---|
| `student` | `/dashboard/student` |
| `instructor` (alias: teacher) | `/dashboard/instructor` |
| `admin` | `/dashboard/admin` |
| `super_admin` (god-mode + انتحال) | `/dashboard/super-admin` |
| `partner` | `/dashboard/partner` (داخل `DashboardLayout` المشترك) |

### هل المسارات محروسة؟ نعم — بمرحلتين

1. **`ProtectedRoute`** — بوابة مصادقة فقط (spinner تحميل لتفادي وميض الدخول/الخروج، وحفظ المسار المقصود في `location.state.from`).
2. **`DashboardAccessGuard`** — بوابة تفويض عبر `canAccessDashboardPath`؛ يعيد التوجيه إلى المسار الرئيسي للدور عند الرفض.

> 🔴 **حدّ أمني — التفويض على العميل فقط:** كل قواعد الأدوار تعيش في حزمة React وقابلة للتجاوز تماماً (تعديل دور `emc_user` في localStorage أو استدعاء الـ API مباشرةً). هذا صحيح كـ **UX** لكنه **ليس حدّاً أمنياً**. يجب أن يطابق Laravel كل قاعدة namespace على الخادم — خاصةً مسارات الانتحال (`/admin/impersonate/*`) و CRUD الخاص بـ super-admin. التوصية: اعتبار `dashboardAccess.ts` توجيهاً تجميلياً فقط، وإضافة فحص عقد (contract test) يثبت أن قواعد الواجهة مجموعة جزئية من سياسات الخادم.

---

## 8. التحميل الكسول (Lazy-loading)

🟢 تقسيم عدواني ومتعمّد: eager فقط لـ 5 صفحات حرجة، وكل ما عداها مقسّم (‎182 استدعاء `lazy()`؛ البناء يؤكّد per-route chunks بحجوم ‎20–60KB غالباً). `pdf-lib` و Sentry يُحمَّلان ديناميكياً فقط عند الحاجة.

🟡 **مشكلة Suspense واحدة فوق `DashboardLayout`:** الحدّ الوحيد يقع *فوق* الـ `<Outlet/>`، و‎~152 من المسارات الفرعية للوحة هي عناصر lazy عارية بلا `Suspense` داخلي (مقابل ‎~20 لها حدّها الخاص). نتيجةً لذلك، التنقّل إلى أيّ من تلك المسارات يستبدل **الهيكل بأكمله** (الشريط الجانبي + العلوي) بشاشة «جارٍ تحميل لوحة التحكم» — وميض مرئي.

**الإصلاح المقترح:** إضافة `Suspense` داخلي يلفّ الـ `<Outlet/>` داخل `DashboardLayout.tsx:734` بحيث يبقى الهيكل مثبّتاً ويظهر spinner في منطقة المحتوى فقط:

```tsx
// داخل DashboardLayout، حول الـ Outlet
<Suspense fallback={<ContentAreaFallback/>}>
  <Outlet/>
</Suspense>
```

---

## 9. حدود الأخطاء (Error Boundaries) و 404

| العنصر | الملف | الحالة |
|---|---|---|
| الحدّ الأعلى | `components/ErrorBoundary.tsx` | 🟢 يبلّغ Sentry عند توفّر DSN فقط، fallback عربي RTL، تفاصيل في DEV فقط |
| حدّ قسمي قابل للإعادة | `components/errors/SectionErrorBoundary.tsx` | 🟡 **مبنيّ لكن غير مستخدَم فعلياً** (لا يلفّ الـ Outlet ولا أي widget) — أي خطأ render يُفرّغ التطبيق كاملاً |
| صفحات الأخطاء | `/401 /403 /404 /500` + `ErrorPageShell` | 🟢 موصولة |
| 404 العام | `App.tsx:277` `<Route path="*" element={<NotFound/>}>` | 🟢 موجود في كتلة `Layout` العامة |
| 404 داخل اللوحة | — | 🟡 **مفقود:** المسارات `/dashboard/*` غير المعروفة تُعيد التوجيه بصمت إلى المسار الرئيسي للدور، فيلتبس «لا توجد صفحة» بـ «ممنوع» |

**الإصلاح:** لفّ الـ `<Outlet/>` بـ `SectionErrorBoundary`، وإضافة `<Route path="*" element={<NotFoundInDashboard/>}>` داخل شجرة اللوحة.

---

## 10. النموذج الذهني (الصورة الكبيرة)

- **SPA عربية أولاً RTL** أمام **Laravel REST API منفصل**؛ كل بيانات المجال من الـ API.
- **جدول مسارات مركزي واحد** (`App.tsx`) مع تقسيم عدواني، فوق **هيكلين**: عام ولوحة تحكم.
- **شجرة مزوّدات نظيفة** (Helmet → ErrorBoundary → CookieConsent → Router → Auth).
- **حراسة بمرحلتين** (مصادقة ثم تفويض) فوق **محرك أدوار من 20 دوراً** بقاعدة البادئة الأطول — وهو أقوى أصول التطبيق، **لكنه على العميل فقط**.
- **صحّة الأنواع جيدة** (`tsc` نظيف) رغم **دَيْن lint حقيقي**؛ الاختبارات تمر لكن تغطيتها رقيقة (‎~0.5%).
- النضج الأعلى في شريحة **LMS**؛ الدَّيْن الأبرز في **i18n (لا توجد طبقة ترجمة)** و**الأمن (token في localStorage، تفويض عميل فقط، dompurify قديم)** و**البنية التحتية (لا CI)**.

---

## 11. الوثائق القديمة (STALE) — تنبيه صريح 🟡

| الملف | الحالة | لماذا مضلّل |
|---|---|---|
| `README.md` | **قديم** | يصف نسخة مبكّرة بـ ‎~8 صفحات وشعاراً نائباً (`via.placeholder.com`) |
| `CODEBASE_ANALYSIS.md` (335 سطراً) | **قديم بشدّة** | يصف تطبيقاً أصغر بكثير (‎~10 صفحات) ويزعم «لا اختبارات»، «لا Context/حالة عامة»، «API URL مثبّت»، «لا code-splitting» — **كلها لم تعد صحيحة** |
| `README_FRONTEND_PROGRESS.md` (237 سطراً) | الأحدث نسبياً | سجلّ مراحل (1–6 مكتملة، 7 تالية) |
| `AGENTS.md` | **غير ذي صلة** | يصف «WAT framework» بايثونياً (tools/ + Google Sheets) لا يطابق هذا المشروع — قصاصة منسوخة. يُحذف أو يُعاد كتابته |

كذلك ادّعاء README بدعم **EN/NL/AR** غير صحيح حالياً: لا توجد مكتبة i18n ولا دالة `t(`؛ التطبيق عربي مفرد عملياً (انظر تقرير i18n اللاحق).

---

## 12. التوصيات (مرتّبة حسب الأولوية)

- [ ] 🔴 **توثيق أن التفويض على العميل فقط** والتأكّد من مطابقة Laravel لكل قاعدة namespace (خاصةً الانتحال و super-admin CRUD)؛ إضافة فحص عقد يثبت أن قواعد الواجهة مجموعة جزئية من الخادم. (`dashboardAccess.ts`، `DashboardAccessGuard.tsx`)
- [ ] 🟠 **تقليل سطح سرقة الـ token:** تفضيل كوكيز `httpOnly, Secure, SameSite` يصدرها Laravel للجلسة بدل localStorage؛ كحدّ أدنى تقليص عمر النسخة الاحتياطية للانتحال في `sessionStorage`. (`AuthContext.tsx:66,82,117`؛ `axios.ts:36`)
- [ ] 🟡 **إضافة `Suspense` داخلي** حول `<Outlet/>` في `DashboardLayout.tsx:734` لإبقاء الهيكل مثبّتاً وإزالة الوميض على ‎~152 مساراً.
- [ ] 🟡 **توظيف `SectionErrorBoundary`** حول الـ Outlet وأقسام اللوحة الرئيسية لعزل أعطال الـ render.
- [ ] 🟡 **إضافة 404 داخل اللوحة** (`<Route path="*">` داخل شجرة `DashboardAccessGuard`) وتوجيه حالات الرفض الحقيقية إلى `/403`.
- [ ] 🟡 **حذف الكود الميت والخردة:** `PartnerLayout.tsx` غير المستخدَم، التبعية `"i"`، ومكتبة `sonner` غير المستخدَمة (`npm uninstall i sonner`).
- [ ] 🟡 **تصحيح الوثائق القديمة:** تحديث/حذف `README.md` و `CODEBASE_ANALYSIS.md`، وحذف `AGENTS.md` غير ذي الصلة؛ ووسم ادعاء EN/NL/AR كبند خارطة طريق لا قدرة حالية.

---

*هذا التقرير الأول ضمن سلسلة التقييم؛ التفاصيل الأعمق لطبقة الـ API والحالة والـ UI والأمن والاختبار و i18n في التقارير اللاحقة.*

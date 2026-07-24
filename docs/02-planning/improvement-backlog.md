# قائمة التحسينات — emc-frontend

قائمة مرتّبة بالأولوية لكل إصلاح ملموس رصدته التقارير `01`–`07`، مع الجهد التقديري والمجال والمرجع. مرتَّبة من الأعلى أولوية إلى الأدنى.

آخر تحديث: 2026-06-21 · الفرع: dev

---

## المفتاح

- **الأولوية:** 🔴 عاجل · 🟠 عالٍ · 🟡 متوسط · 🟢 منخفض
- **الجهد:** S (ساعات) · M (يوم–يومان) · L (أسبوع+)
- **يعالج:** رقم التقرير المصدر في `docs/01-assessment/`.

---

## القائمة

| # | المهمة | الأولوية | الجهد | المجال | يعالج |
|---|---|---|---|---|---|
| 1 | `npm audit fix` لإصلاح الـ5 ثغرات (vite/undici/form-data HIGH + dompurify + @babel/core) ثم build+test | 🔴 | S | الأمن | 05 |
| 2 | إصلاح `SessionCard.tsx:47` — رفع `Date.now()` إلى state + `setInterval` (طهارة + ظهور زرّ الانضمام) | 🔴 | S | جودة الكود / LMS | 02·03·06 |
| 3 | إصلاح `DepartmentSection.tsx`/`ExecutiveSection.tsx` — مكوّن أيقونة على مستوى الوحدة (static-components) | 🔴 | S | جودة الكود | 02·03·06·07 |
| 4 | إصلاح `HomeCourseCard.tsx:119` — حذف `\|\| true` (no-constant-binary-expression) | 🔴 | S | جودة الكود / الموقع العام | 02·03·06 |
| 5 | إضافة بوّابة CI (GitHub Actions): lint + tsc + test + build + audit على PRs نحو dev/main | 🔴 | S | البنية التحتية | 03·05·06 |
| 6 | استبدال `public/favicon.svg` (493KB raster) بـ favicon صغير حقيقي (بضعة KB) | 🔴 | S | الأداء | 06 |
| 7 | توثيق أن التفويض على العميل فقط + تأكيد مطابقة Laravel خادمياً + فحص عقد (contract test) | 🔴 | M | الأمن / RBAC | 01·02 |
| 8 | نقل token الجلسة إلى كوكيز httpOnly + إدارة الانتحال خادمياً (بدل localStorage/sessionStorage) | 🔴 | L | الأمن | 01·04·05 |
| 9 | إخضرار الـ lint: `eslint --fix` + حذف `_err`/`_userId`/`vols` الميتة (courseLearnApi/learningPathsApi/hrDashboardApi) | 🔴 | S | جودة الكود / API | 03·04·06 |
| 10 | فصل تصديرات `react-refresh/only-export-components` (~13 خطأ: finance/lms/super-admin/forms) | 🟠 | M | جودة الكود | 03·06 |
| 11 | إضافة `timeout: 20_000` إلى `axios.create` (مع تجاوز لكل نداء للرفع/التقارير) | 🟠 | S | API | 04 |
| 12 | تبنّي نمط `ignore`/`AbortSignal` للإلغاء (بدءاً بـ `useStudentDashboardData.ts:223-291`) | 🟠 | M | API / الحالة | 04 |
| 13 | بناء تغطية اختبار للتوصيل الأمني الحرج (`ProtectedRoute`/`DashboardAccessGuard`/`AuthContext`) + إدخال MSW | 🔴 | L | الاختبار | 06 |
| 14 | إزالة وصف «موثّق» عن أرقام العرض أو ربطها بـ Impact API (`impactDashboard.ts`/`ImpactOverviewSection`/`HomeStatsBand`) | 🟠 | M | نزاهة المحتوى | 02 |
| 15 | تفعيل `strict`/`strictNullChecks` تدريجياً في `tsconfig.app.json` ومعالجة الأخطاء per-domain | 🟠 | L | البناء / الأنواع | 05·06 |
| 16 | تبنّي `@tanstack/react-query` لحالة الخادم (cache/dedup/abort/retry) وترحيل أول 5–10 صفحات | 🟠 | L | API / الحالة | 04 |
| 17 | استخراج hook عام `useResource<T>` وترحيل نمط الجلب المكرّر عبر ~95 ملفاً (إن تأجّل react-query) | 🟠 | L | الحالة / الـ hooks | 03·04 |
| 18 | بدء طبقة i18n: `react-i18next` (ar مصدراً) + `LanguageProvider` يضبط `documentElement.lang`/`dir` | 🟠 | L | i18n | 07 |
| 19 | تكافؤ لوحات المديرين الأربع مع `ProgramsManagerDashboardPage` (KPIs مدفوعة بالبيانات) | 🟠 | L | الميزات / لوحات المديرين | 02 |
| 20 | إضافة `<PublicSeo>` لكل صفحة معلوماتية (Departments/Team/Impact/Partnerships/Volunteer/Contact/InstructorDetail) | 🟠 | M | SEO | 02·07 |
| 21 | debounce + abort للبحث العام قبل `semanticSearch` (`GlobalSearchCommand.tsx:33-36`) | 🟠 | S | الميزات / الأداء | 02 |
| 22 | إصلاح التباين اللوني: token برتقالي أغمق (~`#B5650F`) للنص/الروابط + مراجعة 187 موضع `text-customOrange` | 🟠 | M | a11y / التصميم | 07 |
| 23 | توحيد النوافذ على نمط `<dialog>`/`showModal()` (حصر تركيز + Escape + aria-modal + استعادة تركيز) | 🟠 | L | a11y | 07 |
| 24 | إتاحة لوحة المفاتيح في ملتقطات التاريخ/الوقت (Escape + roving tabindex + `role=grid`) | 🟠 | M | a11y | 07 |
| 25 | إنهاء هجرة design system: اعتماد `Emc*`/`Surface`، إهلاك `App*`، طيّ ملفّات SectionHeader الأربعة | 🟠 | L | التصميم | 07 |
| 26 | تحفيظ `AuthContext` (`useCallback` + `useMemo`) لإيقاف إعادة تصيير 41 مستهلكاً | 🟡 | S | الحالة | 03·04 |
| 27 | توجيه تنزيل ملف `SubmissionReviewPanel` عبر `apiClient` (responseType blob) + إصلاح fallback `VITE_API_BASE_URL` | 🟡 | S | API / LMS | 02·04·05 |
| 28 | توحيد دوال unwrap على `unwrapData`/`asList` وحذف النسخ المحلية السبع + دالة `getApiBaseUrl()` | 🟡 | M | API | 03·04 |
| 29 | دمج ملفّي الدورات المتنافسين (`api/coursesApi.public.ts` مقابل `services/coursesApi.ts`) | 🟡 | M | API / الدورات | 02·03·04 |
| 30 | توحيد منطق تطبيع الجلسات (حذف نسخة `studentApi.ts:854+` لصالح `utils/lmsSession.ts`) | 🟡 | S | API / LMS | 02·04 |
| 31 | تقسيم God files (`placementApi` 1575 / `studentApi` 1291 / `courseLearnApi` 845) إلى نقل + مُطبِّعات | 🟡 | L | جودة الكود / API | 03·04 |
| 32 | `Sentry.captureException` في كتل catch المُبتلِعة (102 موقعاً) قبل إرجاع البديل الفارغ | 🟡 | M | API / المراقبة | 04·05 |
| 33 | إضافة `Suspense` داخلي حول `<Outlet/>` في `DashboardLayout.tsx:734` (إزالة وميض ~152 مساراً) | 🟡 | S | المعمارية | 01 |
| 34 | لفّ الـ Outlet بـ `SectionErrorBoundary` الموجود + إضافة 404 داخل لوحة التحكم | 🟡 | M | المعمارية | 01·02 |
| 35 | `npm uninstall i sonner` + إزالة قاعدة `vendor-toast`/`sonner` الميتة من `manualChunks` | 🟡 | S | التبعيات / البندل | 03·05·06·07 |
| 36 | حذف الملفّين الفارغين المتتبَّعين `dir` و`C:tempteam_data.txt` (`git rm`) | 🟡 | S | النظافة | 03·05 |
| 37 | حذف `AGENTS.md` غير ذي الصلة + تحديث/حذف `README.md` و`CODEBASE_ANALYSIS.md` القديمين | 🟡 | S | الوثائق | 01·03·05 |
| 38 | إصلاح `.env.example`: تفريغ `VITE_WHATSAPP_COMMUNITY_URL` + إزالة المسافتين البادئتين + تصحيح فاصل التعليق | 🟡 | S | الأمن / البيئة | 05 |
| 39 | تقليص حزمة `vendor` تحت 500KB (مدخلات `manualChunks` لـ react-select/helmet/libphonenumber/iso-countries/image-compression) | 🟡 | S | البندل | 06 |
| 40 | إزالة الـ hex الخام من `components/ui` (75 موضعاً) + حذف البُنّيّ `#b9872f` + قاعدة lint تمنع الـ hex | 🟡 | M | التصميم | 07 |
| 41 | توحيد تركيب الأصناف على `cn()` في الـ7 مكوّنات المتبقية + focus-ring على `.emc-focus-ring` | 🟡 | S | التصميم | 07 |
| 42 | `<MotionConfig reducedMotion="user">` في `main.tsx` (احترام تقليل الحركة عالمياً) | 🟡 | S | a11y / الحركة | 07 |
| 43 | إصلاح `test:coverage` بتثبيت `@vitest/coverage-v8` + هدف تغطية أولي قابل للزيادة | 🟡 | S | الاختبار | 05·06 |
| 44 | ربط استطلاع الإشعارات بـ `document.visibility` + `.catch` (`DashboardLayout.tsx:617-640`) | 🟡 | S | الميزات / الأداء | 02 |
| 45 | دفع مرشّحات السعر/التسجيل للمسارات التعليمية إلى الـ API بدل تصفية الصفحة الحالية | 🟡 | S | الميزات / LMS | 02 |
| 46 | حذف النسخ التسويقية placeholder المنشورة (`Partnerships.tsx:159-179`) وحسم سلوك `TeamPage` الاحتياطي | 🟡 | M | نزاهة المحتوى | 02 |
| 47 | تنظيف hook الطالب: إزالة تبعية `userId` غير المستخدمة من `load`، وترحيل/حذف `useStudentLearningLists` shim | 🟢 | S | الحالة | 04 |
| 48 | تحميل الخطوط عبر `<link>` + preconnect (أو استضافة ذاتية `@fontsource` مع subset) | 🟢 | M | الأداء / الخطوط | 07 |
| 49 | نص بديل وصفي للصور المعلوماتية (عنوان الدورة/اسم المدرّب) بدل `alt=""` | 🟢 | S | a11y | 07 |
| 50 | إضافة `min`/`max`/`disabledDate` لملتقطات التاريخ في تدفّقات الجدولة | 🟢 | M | a11y / التصميم | 07 |
| 51 | تفعيل Dependabot/Renovate لمتابعة تحديثات الأمان على نسخ الحافة النازفة | 🟢 | S | الأمن / التبعيات | 05·06 |
| 52 | حذف `PartnerLayout.tsx` الميت (أو توصيله إن أُريد هيكل شريك مستقل) | 🟢 | S | المعمارية | 01 |

---

## ملخّص التوزيع

| الأولوية | العدد |
|---|---|
| 🔴 عاجل | 9 |
| 🟠 عالٍ | 16 |
| 🟡 متوسط | 21 |
| 🟢 منخفض | 6 |
| **الإجمالي** | **52** |

> الترتيب الموصى به: ابدأ بالبنود 1–9 (المرحلة 0 في خارطة الطريق) قبل أي شيء آخر، فهي شرط استقرار بقية العمل.

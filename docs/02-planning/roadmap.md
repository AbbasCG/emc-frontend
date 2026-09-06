# خارطة الطريق — emc-frontend

خطة مرحلية عملية لنقل واجهة `emc-frontend` من تطبيق ناضج مثقَل بدَيْن إلى منصّة إنتاجية مستقرّة، مبنية على نتائج التقارير `01`–`07`. هذا **ليس مشروعاً من الصفر**: النواة (LMS، RBAC، الدفع، التقويم، طبقة API مُحصَّنة) ناضجة فعلاً، فتركيز الخطة هو **تثبيت الأساس ومعالجة الدَّيْن** لا إعادة البناء.

آخر تحديث: 2026-06-21 · الفرع: dev

---

## مفتاح الخطورة والجهد

🔴 حرِج · 🟠 مهم · 🟡 ثانوي · 🟢 جيد (يُصان) — الجهد: S (ساعات) · M (أيام) · L (أسبوع+).

## نظرة عامة على المراحل

| المرحلة | العنوان | الهدف المحوري |
|---|---|---|
| 0 | استقرار وتنظيف عاجل | إيقاف النزيف: أمن + أخطاء حقيقية + lint أخضر + CI |
| 1 | تصليب الأساس | API مُحصَّن + حالة خادم + strict + i18n + حراسة |
| 2 | إكمال المجالات وتوحيد النظام | لوحات المديرين + design system + toast واحد |
| 3 | الجودة | اختبارات + a11y + أداء/بندل + SEO |
| 4 | الإطلاق | CI/CD + مراقبة Sentry + صور/خطوط |

---

## المرحلة 0 — استقرار وتنظيف عاجل 🔴

**الأهداف:** إيقاف المخاطر الفورية وجعل المستودع قابلاً للدمج بأمان. كلها إصلاحات منخفضة المخاطرة عالية الأثر (البناء والاختبارات تمرّ أصلاً).

**المهام الملموسة:**

- [ ] 🔴 **`npm audit fix`** ثم `npm run build && npm test` — يُصلح الـ5 ثغرات (`vite`/`undici`/`form-data` HIGH، و`dompurify` MODERATE→≥3.4.11، و`@babel/core` LOW). [تقرير 05]
- [ ] 🔴 **إصلاح الأخطاء الثلاثة الحقيقية (lint):**
  - `src/components/lms/SessionCard.tsx:47` — رفع `Date.now()` إلى state مع `setInterval(…, 30_000)` (يُصلح الطهارة + ظهور زرّ الانضمام بالزمن الحقيقي).
  - `src/components/team/DepartmentSection.tsx` + `ExecutiveSection.tsx` — مكوّن `<DeptIcon iconKey=.../>` على مستوى الوحدة بدل `const Icon = resolveDepartmentIcon(...)` أثناء الرسم.
  - `src/components/home/HomeCourseCard.tsx:119` — حذف `|| true` من الحارس.
- [ ] 🔴 **إخضرار الـ lint بالكامل:** `eslint --fix` للنظافة (`prefer-const`)، حذف `_err`/`_userId`/`vols` الميتة (`courseLearnApi.ts:633`، `learningPathsApi.ts:446`، `hrDashboardApi.ts:182`)، وفصل المساعِدات عن المكوّنات لإطفاء أخطاء `react-refresh/only-export-components` (~13 في طبقة الإدارة).
- [ ] 🔴 **إضافة بوّابة CI (GitHub Actions)** على PRs نحو `dev`/`main`: `npm ci && npm run lint && npx tsc -b && npm test && npm run build && npm audit --audit-level=high`.
- [ ] 🟠 **حذف المخلّفات:** `npm uninstall i sonner`؛ `git rm dir 'C:tempteam_data.txt'`؛ حذف `AGENTS.md` (يصف «WAT framework» غير ذي صلة)؛ وإزالة قاعدة `vendor-toast`/`sonner` الميتة من `manualChunks`.
- [ ] 🟠 **إصلاح `.env.example`:** تفريغ `VITE_WHATSAPP_COMMUNITY_URL=` وإزالة المسافتين البادئتين وتصحيح فاصل التعليق بالسطر 29.
- [ ] 🟠 **استبدال `public/favicon.svg`** (493KB raster مُضمَّن) بـ favicon صغير حقيقي (PNG/ICO 32×32/180×180، بضعة KB).
- [ ] 🟡 **تصحيح الوثائق القديمة:** تحديث/حذف `README.md` و`CODEBASE_ANALYSIS.md` (يدّعيان «لا اختبارات/لا تقسيم كود/API مثبّت» — كلها لم تعد صحيحة)؛ ووسم ادّعاء EN/NL/AR كبند خارطة طريق.

**تعريف الإنجاز (المرحلة 0):** `npm audit` نظيف من HIGH · `npm run lint` يخرج 0 · CI أخضر على كل PR · لا حزم/ملفات خردة في `git status` · favicon < 10KB · `npm test` و`tsc -b` يمرّان عبر CI.

---

## المرحلة 1 — تصليب الأساس 🟠

**الأهداف:** تحويل طبقة الـ API والحالة والأنواع من «جيدة يدوياً» إلى «محصَّنة بنيوياً»، ومراجعة الأمن والحراسة، وبدء طبقة i18n.

**المهام الملموسة:**

- [ ] 🔴 **مراجعة التفويض الخادمي:** توثيق أن `dashboardAccess.ts` توجيه UX فقط؛ تأكيد مطابقة Laravel لكل قاعدة namespace (خاصةً `/admin/impersonate/*` وCRUD المشرف الأعلى)؛ وإضافة فحص عقد (contract test) يثبت أن قواعد الواجهة مجموعة جزئية من سياسات الخادم. [01·02]
- [ ] 🔴 **معالجة تخزين الـ token:** تفضيل كوكيز `httpOnly, Secure, SameSite` يصدرها Laravel للجلسة؛ وإدارة الانتحال من جانب الخادم بحيث لا يُخزَّن رمز المدير الأصلي على العميل. كحلّ وسيط: token في الذاكرة + TTL قصير. [05]
- [ ] 🟠 **`timeout` + إلغاء:** إضافة `timeout: 20_000` إلى `axios.create`؛ تبنّي نمط `ignore`/`AbortSignal` في `useStudentDashboardData.ts:223-291` ثم تمريره تدريجياً عبر دوال الـ API لإنهاء سباقات setState-بعد-unmount. [04]
- [ ] 🟠 **اعتماد حالة الخادم (TanStack Query):** إدخال `@tanstack/react-query` + `QueryClientProvider` في `main.tsx`، وترحيل أول 5–10 صفحات عالية التكرار (الكتالوج/الإشعارات/لوحات الإدارة) — يمنح cache/dedup/abort/retry مجاناً ويُلغي عشرات المُحمّلات اليدوية. (بديل وسيط: استخراج hook عام `useResource<T>`.) [04]
- [ ] 🟠 **تفعيل `strict` تدريجياً** في `tsconfig.app.json` بدءاً بـ `strictNullChecks`، ومعالجة الأخطاء الناتجة على دفعات per-domain. [05·06]
- [ ] 🟠 **بدء طبقة i18n:** تبنّي `react-i18next` مع كتالوج `ar` كلغة مصدر، و`LanguageProvider` يضبط `documentElement.lang`/`dir` من الحالة؛ بدء الهجرة بـ `shared/ui` + `nav` + الصفحات العامة عبر codemod. [07]
- [ ] 🟠 **مراجعة الحراسة وحدود الأخطاء:** إضافة `Suspense` داخلي حول `<Outlet/>` في `DashboardLayout.tsx:734`؛ لفّ الـ Outlet بـ `SectionErrorBoundary` الموجود (المبنيّ وغير المستخدَم)؛ وإضافة 404 داخل اللوحة. [01]
- [ ] 🟡 **تحفيظ `AuthContext`** (`useCallback` + `useMemo`) محاكاةً لـ `CookieConsentContext` — يوقف إعادة تصيير 41 مستهلكاً. [03·04]
- [ ] 🟡 **توحيد دوال unwrap** على `unwrapData`/`asList` وحذف النسخ المحلية السبع؛ ودمج ملفّي الدورات المتنافسين (`coursesApi.public.ts` مقابل `services/coursesApi.ts`)؛ ودالة `getApiBaseUrl()` مركزية. [03·04]
- [ ] 🟡 **`Sentry.captureException`** في كتل catch المُبتلِعة (102 موقعاً) قبل إرجاع البديل الفارغ. [04·05]

**تعريف الإنجاز (المرحلة 1):** التفويض موثَّق + فحص عقد يمرّ · قرار token مُتَّخذ ومُنفَّذ (كوكيز أو خطة موثَّقة) · `axios` به timeout + إلغاء في المُحمّلات الحرجة · `strictNullChecks` مُفعَّل و`tsc` أخضر · `react-i18next` مُركَّب وأول نطاق مُهاجَر · لا تكرار في unwrap.

---

## المرحلة 2 — إكمال المجالات وتوحيد النظام 🟠

**الأهداف:** سدّ الفجوات الوظيفية في «الأطراف» التنظيمية، وإنهاء هجرة design system، وتوحيد التبعيات المزدوجة.

**المهام الملموسة:**

- [ ] 🟠 **تكافؤ لوحات المديرين:** تحويل اللوحات الأربع (`Community`/`Operations`/`Partnerships`/`SectionLead`) من محاور روابط إلى لوحات مدفوعة بـ KPI على نسق `ProgramsManagerDashboardPage`. [02]
- [ ] 🟠 **نزاهة المحتوى العام:** إزالة وصف «موثّق» عن أرقام العرض (`impactDashboard.ts`، `ImpactOverviewSection.tsx:40`، `HomeStatsBand.tsx`) أو ربطها بـ Impact API؛ وحذف النسخ التسويقية placeholder (`Partnerships.tsx:159-179`)؛ وحسم سلوك `TeamPage` الاحتياطي. [02]
- [ ] 🟠 **إنهاء هجرة design system:** اعتماد جيل `Emc*`/`Surface` قاعدةً، إهلاك `App*` (أو جعلها re-exports رفيعة)، وطيّ ملفّات `SectionHeader` الأربعة في واحد، وتصدير المجموعة الموحَّدة من `ui/index.ts`. [07]
- [ ] 🟡 **توحيد toast على مكتبة واحدة** (`react-hot-toast`) — تأكيد إزالة `sonner` (المرحلة 0) واعتماد غلاف `src/lib/toast` حصراً. [03·06·07]
- [ ] 🟡 **إزالة الـ hex الخام** من `components/ui` (75 موضعاً)، حذف البُنّيّ `#b9872f` خارج اللوحة، وتوحيد تركيب الأصناف على `cn()` في الـ7 مكوّنات المتبقية + focus-ring على `.emc-focus-ring`؛ وقاعدة lint تمنع الـ hex. [07]
- [ ] 🟡 **تقسيم God files** (`placementApi` 1575، `studentApi` 1291، `courseLearnApi` 845) إلى `<domain>Api.ts` (نقل رقيق) + `<domain>Normalizers.ts` (مُطبِّعات نقية قابلة للاختبار). [03·04]
- [ ] 🟡 **سدّ ثغرات تشغيلية:** debounce + abort للبحث العام (`GlobalSearchCommand.tsx:33-36`)؛ ربط استطلاع الإشعارات بـ `document.visibility` + `.catch` (`DashboardLayout.tsx:617-640`)؛ ودفع مرشّحات السعر/التسجيل للمسارات إلى الـ API. [02]

**تعريف الإنجاز (المرحلة 2):** لوحات المديرين الأربع تعرض KPIs حقيقية · لا محتوى «موثّق» وهمي ولا placeholder منشور · مجموعة primitives واحدة في `ui/index.ts` · مكتبة toast واحدة · God files مقسَّمة.

---

## المرحلة 3 — الجودة 🟠

**الأهداف:** رفع تغطية الاختبارات، وإصلاح الوصول والأداء و SEO.

**المهام الملموسة:**

- [ ] 🔴 **رفع تغطية الاختبارات:** إدخال MSW لعميل axios؛ اختبارات تكامل للتوصيل الأمني الحرج (`ProtectedRoute`، `DashboardAccessGuard`، `AuthContext`)؛ اختبارات لأعقد النماذج (`EnrollmentForm`، معالج النماذج، `SubmissionReviewPanel`)؛ و smoke render لكل مسار أعلى-مستوى. هدف أولي واقعي ~30% وارتفاع تدريجي. [06]
- [ ] 🟠 **إصلاح الوصول (a11y):** token برتقالي أغمق (~`#B5650F`) للنص/الروابط ومراجعة 187 موضع `text-customOrange`؛ توحيد النوافذ على نمط `<dialog>`/`showModal()`؛ إتاحة لوحة المفاتيح في الملتقطات (Escape + roving tabindex + `role=grid`)؛ ونص بديل وصفي للصور المعلوماتية. [07]
- [ ] 🟠 **إضافة `PublicSeo`** لكل صفحة معلوماتية (Departments/Team/Impact/Partnerships/Volunteer/Contact/InstructorDetail). [02·07]
- [ ] 🟡 **تحسين البندل:** تقليص حزمة `vendor` تحت 500KB بإضافة مدخلات `manualChunks` لـ `react-select`/`react-helmet-async`/`libphonenumber-js`/`i18n-iso-countries`/`browser-image-compression`؛ ومراقبة `index.css` (40KB gzip). [06]
- [ ] 🟡 **`<MotionConfig reducedMotion="user">`** في `main.tsx` ليحترم framer-motion تقليل الحركة عالمياً (311 ملفاً تتجاهله حالياً). [07]
- [ ] 🟡 **إصلاح `test:coverage`** بتثبيت `@vitest/coverage-v8`. [05·06]

**تعريف الإنجاز (المرحلة 3):** MSW + تغطية ~30% مع التوصيل الأمني مُختبَر · لا نص يخالف WCAG AA · كل النوافذ بحصر تركيز + Escape · `PublicSeo` على كل صفحة عامة · `vendor` < 500KB · `test:coverage` يعمل.

---

## المرحلة 4 — الإطلاق 🟢

**الأهداف:** نضج التشغيل: نشر آلي، مراقبة، وتحسين الأصول النهائي.

**المهام الملموسة:**

- [ ] 🟠 **CI/CD كامل:** توسيع بوّابة المرحلة 0 إلى نشر آلي (preview على PR، نشر على الدمج)؛ وتفعيل Dependabot/Renovate لمتابعة تحديثات الأمان على نسخ الحافة النازفة (Vite 8 / React 19 / TS 6 / ESLint 10). [05·06]
- [ ] 🟠 **تفعيل مراقبة Sentry** في الإنتاج (DSN مضبوط)، والتحقق من وصول الأخطاء المُبتلَعة عبر `captureException` المُضافة في المرحلة 1. [05]
- [ ] 🟡 **تحسين الصور والخطوط:** نقل تحميل الخطوط إلى `<link>` + preconnect إلى `fonts.gstatic.com` (أو استضافة ذاتية عبر `@fontsource` مع subset عربي+لاتيني)؛ ومراجعة `logo.png` الثقيل. [06·07]
- [ ] 🟡 **متابعة i18n:** استكمال الهجرة، تحلية SEO وإصدار `hreflang`/`og:locale` من اللغة النشطة عند توفّر EN/NL. [07]

**تعريف الإنجاز (المرحلة 4):** نشر آلي يعمل · Dependabot فعّال · Sentry يستقبل أخطاء الإنتاج · خطوط بـ preconnect/self-host · أول رسم أخفّ.

---

## ملخّص التسلسل

```
المرحلة 0 (عاجل)  →  المرحلة 1 (أساس)  →  المرحلة 2 (إكمال)  →  المرحلة 3 (جودة)  →  المرحلة 4 (إطلاق)
أمن+أخطاء+lint+CI    API+state+strict+i18n   لوحات+DS+toast       اختبارات+a11y+بندل    CI/CD+مراقبة
```

> القاعدة الذهبية: **لا تبدأ مرحلة قبل استيفاء «تعريف الإنجاز» للسابقة.** المرحلة 0 شرط لكل ما بعدها لأن CI الأخضر هو ما يحمي بقية العمل.

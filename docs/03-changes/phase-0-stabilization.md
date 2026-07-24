# ✅ تقرير المرحلة 0 — الاستقرار والتنظيف العاجل

> سجلّ تفصيلي لما نُفِّذ فعليًّا في مرحلة الاستقرار، مع التحقّق.
> التاريخ: 2026-06-21 · الفرع: `chore/phase-0-stabilization` (منشقّ عن `dev`) · محليّ (لم يُدفَع).

---

## النتيجة في سطر

> **كل الفجوات الحرِجة في [الملخّص التنفيذي](../01-assessment/00-executive-summary.md) أُغلقت: 0 أخطاء lint، 0 ثغرات، البناء أخضر، 54 اختبارًا تنجح.**

| المقياس | قبل | بعد |
|---------|-----|-----|
| أخطاء ESLint | **58** 🔴 | **0** ✅ |
| ثغرات `npm audit` | **5 (3 HIGH + dompurify)** 🔴 | **0** ✅ |
| البناء (`tsc -b && vite build`) | ✅ | ✅ (2.43s · vite 8.0.16) |
| الاختبارات (`vitest`) | 54 ✅ | **54** ✅ |
| حجم favicon | 493 KB 🔴 | 0.65 KB ✅ |
| تبعيات دخيلة | `i`, `sonner` | محذوفة ✅ |
| ملفّات مخلّفة متتبَّعة | `dir`, `favicon 2.svg` | محذوفة ✅ |

السجلّات الخام: [`tooling-logs/phase0-verify.log`](../01-assessment/tooling-logs/phase0-verify.log) · [`lint-errors-after.log`](../01-assessment/tooling-logs/lint-errors-after.log).

---

## 1. إصلاح الأخطاء الحقيقية الثلاثة (سلوكية + تحجب CI)

| الخطأ | الملف | الإصلاح |
|-------|-------|---------|
| `Date.now()` أثناء render (حالة انضمام غير مستقرّة) | `components/lms/SessionCard.tsx:47` | خطّاف جديد `useNow()` |
| مكوّن يُنشأ أثناء render (يُفقد الحالة) | `components/team/DepartmentSection.tsx`, `ExecutiveSection.tsx` | `createElement(resolveDepartmentIcon(...))` |
| تعبير `&&` دائم الصدق (`\|\| true`) | `components/home/HomeCourseCard.tsx:119` | إزالة الشرط (الكتلة تُعرَض دائمًا) |

## 2. بقيّة أخطاء الـlint (55 خطأ)

- **خطّاف موحّد `src/hooks/useNow.ts`** عالج كلّ مواضع `Date.now()` أثناء render (SessionCard, SuperAdminOverviewPage, WorkshopsManagementPage, StudentCourseLearnPage).
- **ثلاثيّات كجُمَل** (`cond ? await A : await B`) → `if/else` صريح في `CourseContentManagerPage.tsx` (5 مواضع).
- **`catch {}` فارغة** → تعليق توضيحي في `StudentCourseLearnPage.tsx` (3 مواضع).
- **`let x = null` ثمّ إعادة تعيين دائمة** → إزالة التهيئة/`const` في `hrDashboardApi.ts`, `HrDepartmentsPage.tsx`, `courseLearnApi.ts`.
- **memoization** (`preserve-manual-memoization`) → استخراج التبعية في `UsersEnterpriseDetailDrawer.tsx`, `StudentCourseLearnPage.tsx`.

### قراران في إعدادات ESLint (`eslint.config.js`) — مبرَّران وموثَّقان
- `@typescript-eslint/no-unused-vars`: احترام اصطلاح البادئة `_` للمتغيّرات المقصود تجاهلها (نيّة المطوّر الأصلية).
- `react-refresh/only-export-components` → **تحذير** بدل خطأ: قاعدة DX للتطوير (Fast Refresh) بلا أثر تشغيلي؛ التقسيم الصحيح للملفّات مُدرَج في الـ backlog.

> النتيجة: `npm run lint` يخرج بـ0 أخطاء. تبقى **تحذيرات** (غالبها `react-hooks/set-state-in-effect`) لا تحجب الـCI، ومُدرَجة للمعالجة التدريجية.

## 3. الأمان والتبعيات
- `npm uninstall i sonner` — حذف حزمة `i` الدخيلة و`sonner` غير المستخدمة.
- `npm audit fix` — رفع `vite`→8.0.16 و`dompurify`→مُصحَّح و`undici`/`form-data`/`babel`؛ **النتيجة: 0 ثغرات**.

## 4. النظافة
- حذف `dir` (ملف فارغ متتبَّع) و`favicon 2.svg` (مكرّر دخيل).
- استبدال `favicon.svg` (صورة base64 بـ493KB) بـ**favicon SVG حقيقي ~0.65KB** بألوان العلامة (E + نقطة برتقالية).
- تصحيح `.env.example`: إزالة رابط واتساب حقيقي مُسرَّب + مسافتين بادئتين + خطأ مطبعي في الفاصل.

## 5. البنية التحتية
- **CI جديد** (`.github/workflows/ci.yml`): على كل push/PR نحو `main`/`dev` → install + lint + typecheck/build + test، ووظيفة audit استشارية.

---

## الملفّات المتغيّرة (15 ملفًّا + 2 جديد + 2 محذوف)

**جديد:** `src/hooks/useNow.ts` · `.github/workflows/ci.yml`
**محذوف:** `dir` · `public/favicon 2.svg`
**مُعدَّل:** `eslint.config.js` · `.env.example` · `public/favicon.svg` · `package.json`/`package-lock.json` · 11 ملفّ مصدري (api/components/pages).

---

## الخطوة التالية
- مراجعة التغييرات ثمّ الـcommit (لم يُعمَل commit بعد — محليّ على الفرع).
- بدء [خطة تبسيط الواجهة](../02-planning/ux-simplification-plan.md) — المرحلة UX-0 (مكاسب الحركة الفورية).
- متابعة باقي [خارطة الطريق](../02-planning/roadmap.md): i18n، رفع تغطية الاختبارات، تجزئة البندل.

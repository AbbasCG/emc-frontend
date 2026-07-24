# تقرير 06 — البناء والأدوات والاختبارات والأداء

الغرض: تقييم مهني لخط البناء (build pipeline)، وإعدادات الأدوات (TypeScript / ESLint / Vite)، وحجم الحزمة والأداء، ومنظومة الاختبارات، وغياب التكامل المستمر (CI/CD) في تطبيق `emc-frontend`.

آخر تحديث: 2026-06-21 · الفرع: dev

---

## 1. الملخّص التنفيذي

خط البناء وأدوات التطوير في هذا المشروع **حديثة وصحّية بشكل حقيقي**: Vite 8 مع تقسيم كود (code-splitting) قوي على مستوى المسارات (182 استدعاء `lazy()`)، وتقسيم حِزَم البائعين (`manualChunks`)، ومُحسِّن صور (image optimizer) فعّال، وبناء سريع يكتمل في **2.24 ثانية** مع `tsc -b` نظيف تمامًا. هذا أصل (asset) قوي يستحق التقدير.

لكن في المقابل، توجد ثلاث فجوات جوهرية تحوّل هذا الأساس الجيد إلى مخاطرة:

| المحور | الحالة | الخطورة |
|---|---|---|
| `tsc -b` (فحص الأنواع) | ✅ نظيف، يكتمل بنجاح | 🟢 |
| تقسيم الكود (lazy routes) | ✅ 182 مسارًا مُقسَّمًا | 🟢 |
| `"strict": true` في tsconfig | ❌ **غير مُفعَّل** على أي من ملفّي tsconfig | 🔴 |
| ESLint (`npm run lint`) | ❌ **يفشل** (exit 1) — أخطاء حقيقية | 🟠 |
| تغطية الاختبارات | 🔴 54 اختبارًا / 4 ملفات فقط (~0.5% من 753 ملفًا) | 🔴 |
| خط أنابيب CI/CD | 🔴 **غير موجود إطلاقًا** | 🔴 |
| حجم favicon (أول رسم/first paint) | 🔴 493KB (raster مُضمَّن base64) | 🔴 |
| حزمة `vendor` المُجمَّعة | 🟡 542KB (> حدّ التحذير 500KB) | 🟡 |
| ملف CSS الموحَّد | 🟡 308KB خام / ~40KB gzip | 🟡 |

الخلاصة: **البنية التحتية للجودة جاهزة لكنها غير مُفعَّلة**. الاختبارات مُهيّأة (jsdom + RTL) لكنها هيكلية، و`tsc` نظيف لكن دون `strict`، و`lint` يكشف أخطاء لكن لا شيء يمنع دمجها لغياب CI. أعلى الإصلاحات رافعةً هو إضافة CI لأن `lint` يفشل بالفعل.

---

## 2. خط البناء (Build Pipeline)

### 2.1 الأمر والنتيجة

سكربت البناء في `package.json` هو:

```json
"build": "tsc -b && vite build"
```

وهذا تسلسل صحيح: فحص الأنواع أولًا (يفشل البناء إن وُجد خطأ نوع)، ثم تجميع Vite.

نتائج التشغيل الفعلي (2026-06-21 على dev):

| المرحلة | النتيجة |
|---|---|
| `tsc -b` | ✅ يُترجم **نظيفًا تمامًا** — لا أخطاء أنواع 🟢 |
| `vite build` | ✅ ينجح في **2.24s** 🟢 |
| `vite-plugin-image-optimizer` | ✅ يعمل أثناء البناء (يقلّص `logo.png` بنسبة ~32%: 370KB → 252KB) 🟢 |
| code-splitting / lazy chunks | ✅ نشِط — قِطَع (chunks) لكل مسار 🟢 |
| تحذيرات | ⚠️ قطعة واحدة على الأقل تتجاوز 500KB؛ `index.css` = 308.67KB (gzip 40.53KB)؛ أصل PNG ثقيل = 257.67KB |

**صحّة الأنواع جيدة:** أن يجتاز `tsc -b` نظيفًا على قاعدة بحجم ~108k LOC أمر إيجابي ويدلّ على انضباط تايبي حقيقي (الطبقة `src/api` بها صفر `any`). لكن لاحظ أنّ هذا النظافة **مشروطة بغياب `strict`** (راجع §3).

### 2.2 إعداد Vite (`vite.config.ts`)

الإعداد نظيف ومدروس:

- **alias** `@ -> ./src` (مُكرَّر بشكل متطابق في `vitest.config.ts` — جيد).
- **ViteImageOptimizer** بجودة 82 لـ png/jpeg/webp و`includePublic: true` و`logStats: true`.
- **manualChunks** يفصل البائعين إلى حِزَم قابلة للتخزين المؤقت (cacheable): `vendor-react`, `vendor-router`, `vendor-motion`, `vendor-icons`, `vendor-http`, `vendor-toast`, `vendor-charts`, `vendor-docs`, `vendor-sanitize`, `vendor-sentry`، مع `vendor` كحاوية لكل ما تبقّى.

دالة `manualChunks` الحالية (مقتطف من `vite.config.ts:27-42`):

```js
manualChunks(id) {
  if (!id.includes('node_modules')) return undefined
  if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react'
  if (id.includes('react-router')) return 'vendor-router'
  if (id.includes('framer-motion')) return 'vendor-motion'
  if (id.includes('lucide-react')) return 'vendor-icons'
  if (id.includes('axios')) return 'vendor-http'
  if (id.includes('sonner')) return 'vendor-toast'
  if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'vendor-charts'
  if (id.includes('pdfjs') || id.includes('pdf-lib') || id.includes('docx')) return 'vendor-docs'
  if (id.includes('dompurify')) return 'vendor-sanitize'
  if (id.includes('@sentry')) return 'vendor-sentry'
  return 'vendor'
}
```

> **ملاحظة دقيقة:** قاعدة `vendor-toast` تطابق `sonner` فقط، لكن `sonner` غير مستوردة في أي ملف مصدر (`from 'sonner'` = 0 نتائج) — والمستخدَم فعليًا هو `react-hot-toast`. أي أنّ قاعدة التقسيم هذه **ميّتة**، وتُعالَج بإزالة `sonner` (راجع §6.2).

---

## 3. إعدادات TypeScript — غياب `strict`

🔴 **`"strict": true` غير مُفعَّل على أي tsconfig.** تأكّد ذلك بقراءة `tsconfig.app.json` و`tsconfig.node.json` مباشرة.

ما هو مُفعَّل فعلًا في `tsconfig.app.json` (الأسطر 18-22):

```jsonc
/* Linting */
"noUnusedLocals": true,
"noUnusedParameters": true,
"erasableSyntaxOnly": true,
"noFallthroughCasesInSwitch": true,
```

ما هو **غائب**: `strict`، `strictNullChecks`، `noImplicitAny` (لا مجتمعةً ولا منفردة).

**لماذا هذا حرِج هنا تحديدًا:** التطبيق (~108k LOC) يُطبِّع بكثافة JSON قادمًا من Laravel API غير مُنمَّط — الكود مليء بـ `as` casts وحُرّاس `?? ''`. غياب `strictNullChecks` يُزيل أثمن طبقة أمان وقت-الترجمة (compile-time)، ويسمح بمرور أخطاء `null`/`undefined` رغم أنّ `tsc -b` نظيف. النظافة الحالية تُعطي **ثقة زائفة**.

**التوصية:** فعّل `strict` تدريجيًا، بدءًا بـ `strictNullChecks`:

```jsonc
// tsconfig.app.json
{
  "compilerOptions": {
    "strict": true,            // الهدف النهائي
    // أو كخطوة أولى أكثر أمانًا:
    "strictNullChecks": true
  }
}
```

توقّع ظهور أخطاء جديدة؛ عالِجها على دفعات (per-domain) أو خلف متابعة لاحقة (follow-up)، لكن **لا تُشحَن منصّة بهذا الحجم دون فحص null صارم.**

---

## 4. ESLint — يفشل بأخطاء حقيقية

🟠 **`npm run lint` يفشل (exit 1)** مع عشرات النتائج، بعضها أخطاء سلوكية حقيقية لا مجرّد نظافة.

### 4.1 الإعداد (`eslint.config.js`)

flat config على ESLint 10، يمدّ: `js.recommended` + `tseslint.recommended` + `react-hooks (flat recommended)` + `react-refresh (vite)`. القرار الوحيد المخصّص هو خفض قاعدة واحدة إلى تحذير (`eslint.config.js:24`):

```js
// خفض متعمَّد مع تعليق مُبرِّر — يُبقي CI قابلًا للاستخدام
'react-hooks/set-state-in-effect': 'warn',
```

هذا قرار معقول (القاعدة تُعلِّم أنماط «إعادة ضبط الحالة عند التنقّل» المشروعة)، لكنه يُبقي «ضوضاء» تحذيرات عبر ~30 ملفًا.

### 4.2 أخطاء مؤكَّدة (تمنع `lint` نظيفًا)

| الخطأ | الملف:السطر | الأثر |
|---|---|---|
| 🟠 `react-hooks/purity` — استدعاء `Date.now()` أثناء render | `src/components/lms/SessionCard.tsx:47` | غير نقي؛ حالة الانضمام للجلسة لا «تَنبض» — لا يظهر زر «انضم» تلقائيًا عند فتح النافذة الزمنية |
| 🟠 `react-hooks/static-components` — بناء مكوّن `Icon` أثناء render | `src/components/team/DepartmentSection.tsx:39`, `ExecutiveSection.tsx:23` | إعادة ضبط الحالة كل render؛ نمط هشّ |
| 🟠 `no-constant-binary-expression` — `\|\| true` يجعل الشرط ثابت-الصحّة | `src/components/home/HomeCourseCard.tsx:119` | خطأ منطقي: كتلة الميتاداتا تُعرَض دائمًا |
| 🟡 `prefer-const` (`sub`) | `src/api/courseLearnApi.ts:373` | نظافة |
| 🟡 `no-unused-vars` (`_err`) | `src/api/courseLearnApi.ts:633` | نظافة |
| 🟡 `no-unused-vars` (`_userId`) | `src/api/learningPathsApi.ts:446` | باراميتر قد يوحي بنطاق غير موجود |
| 🟡 `no-useless-assignment` (`vols`) | `src/api/hrDashboardApi.ts:182` | إسناد ميّت |
| 🟡 `react-refresh/only-export-components` (متعدّد) | finance / lms / super-admin / forms | تصدير ثوابت/مساعدات بجانب مكوّنات (≈13 خطأ في admin) |

بالإضافة إلى عشرات تحذيرات `react-hooks/set-state-in-effect` + `exhaustive-deps` (معظمها أنماط حميدة).

**التوصية:** شغّل `eslint --fix` للنظافة الآلية (`prefer-const`)، وعالِج الأخطاء الثلاثة السلوكية يدويًا، وافصل تصدير المساعدات عن المكوّنات لحلّ أخطاء `react-refresh`.

---

## 5. تحليل الحزمة والأداء (Bundle & Performance)

### 5.1 مخرجات البناء

إجمالي `dist` = **5.8MB** (JS منها 4.6MB). أكبر القِطَع:

| القطعة | الحجم | ملاحظة |
|---|---|---|
| `vendor` (catch-all) | 542KB | 🟡 يتجاوز حدّ تحذير 500KB |
| `vendor-docs` | 379KB | pdf-lib/docx — لكنه مُحمَّل ديناميكيًا (جيد) |
| `vendor-charts` | 306KB | recharts — في مسارات lazy فقط (جيد) |
| `vendor-react` | 229KB | معقول |
| `index.css` | 308KB خام / 40KB gzip | 🟡 ملف واحد حاجب للعرض (render-blocking) |

أثقل الأصول الثابتة:

| الأصل | الحجم | المشكلة |
|---|---|---|
| 🔴 `public/favicon.svg` | 493KB | ليس متجهًا (vector) بل صورة raster مُضمَّنة base64 داخل `<svg>` (نمط/صورة 180×180). المُحسِّن **يتخطّاه** (`493.73 kB <= 493.73 kB`)، فيُشحَن كاملًا في أول رسم لكل مسار. |
| 🟡 `logo.png` | 378KB مصدر → 251KB بعد البناء | ثقيل لكن مُحسَّن وقت البناء |

### 5.2 ما هو جيّد (يُحتفَظ به) 🟢

- **تقسيم كود ممتاز على مستوى المسارات:** 182 استدعاء `lazy()`؛ معظم قِطَع الصفحات 20–60KB. الصفحات العامة الحرجة فقط (Home/Login/NotFound/ForgotPassword/ResetPassword) مُحمَّلة بشغف (eager).
- **`pdf-lib`** (أثقل مكتبة، ~163KB gz) عبر `import()` ديناميكي في `src/utils/compressPdf.ts` — خارج الحزمة الابتدائية.
- **`@sentry`** عبر dynamic import ولا يُحمَّل ما لم تُضبَط `VITE_SENTRY_DSN`.
- **`manualChunks`** يعزل البائعين في حِزَم قابلة للتخزين المؤقت.

### 5.3 المشكلات والإصلاحات

#### 🔴 [حرِج] favicon بحجم 493KB يُشحَن في أول رسم لكل صفحة

`public/favicon.svg` صورة raster مُضمَّنة، يُشير إليها `index.html`، فتُطلَب عند أول رسم لكل مسار — وهي أثقل أصل في first paint (favicon طبيعي يجب أن يكون 1–5KB).

**الإصلاح:** استبدلها بـ favicon حقيقي صغير: SVG متجه مكتوب يدويًا، أو ملفات `PNG/ICO` بمقاسات `32×32`/`180×180` (بضعة كيلوبايتات). لا تُضمِّن raster داخل SVG.

#### 🟡 [مهم] حزمة `vendor` المُجمَّعة 542KB تتجاوز حدّ التحذير

`manualChunks` لا تُسمّي `react-select`, `react-helmet-async`, `libphonenumber-js`, `i18n-iso-countries`, `browser-image-compression` — فكلّها تسقط في حاوية `vendor` غير المُسمّاة (542KB). `chunkSizeWarningLimit` بالقيمة الافتراضية، فالتحذير حقيقي وغير مكتوم.

**الإصلاح:** أضِف مدخلات إلى `manualChunks` (وتحقّق أنّ كلًّا منها لا تجلبه إلّا مسارات lazy):

```js
if (id.includes('react-select')) return 'vendor-select'
if (id.includes('react-helmet-async')) return 'vendor-helmet'
if (id.includes('libphonenumber-js') || id.includes('i18n-iso-countries')) return 'vendor-intl'
if (id.includes('browser-image-compression')) return 'vendor-imgc'
```

> وأزِل قاعدة `vendor-toast`/`sonner` الميّتة بعد إزالة الاعتمادية.

#### 🟡 [ثانوي] ملف CSS واحد 308KB حاجب للعرض

كل الأنماط تُشحَن في ملف واحد 308KB (40KB gzip)، مُحمَّل بشغف لكل مسار بما فيه الصفحة العامة الخفيفة. 40KB gzip مقبول لكن جدير بالمراقبة.

**الإصلاح:** تأكّد أنّ globs محتوى Tailwind ضيّقة (لا `src/**/*` مفرطة الاتّساع)، ودقّق `@layer components` بحثًا عن تضخّم.

---

## 6. السكربتات والاعتماديات

### 6.1 سكربتات `package.json`

```
dev · build (tsc -b && vite build) · lint · preview ·
test (vitest run) · test:watch · test:ui · test:coverage
```

🟡 **`test:coverage` معطوب افتراضيًا:** السكربت `vitest run --coverage` و`vitest.config.ts` يضبط مُبلِّغات (reporters)، لكن **لا `@vitest/coverage-v8` ولا `@vitest/coverage-istanbul`** مُثبَّت. تشغيل السكربت سيُخطئ أو يطلب المُزوِّد. أضِف `@vitest/coverage-v8` (مُطابِق لـ vitest 4.x) إلى devDependencies، أو احذف السكربت وإعداد التغطية.

### 6.2 اعتماديات ميّتة/زائدة 🟡

| الاعتمادية | الحالة | الإجراء |
|---|---|---|
| `sonner` | مكتبة toast ثانية، 0 استيراد في src | `npm uninstall sonner` (المُستخدَم: `react-hot-toast`) |
| `i` (`^0.3.7`) | مكتبة Node-only، 0 استيراد — أثر `npm i` خاطئ | `npm uninstall i` |

إزالتهما تُقلِّل سطح التثبيت والتدقيق (supply-chain).

---

## 7. الاختبارات (Testing)

### 7.1 البنية التحتية — جاهزة وصحيحة 🟢

`vitest.config.ts` مُهيّأ جيدًا: `environment: 'jsdom'`، `globals: true`، `setupFiles: ['./src/test/setup.ts']` (يستورد `@testing-library/jest-dom`)، و`include: ['src/**/*.{test,spec}.{ts,tsx}']`. الحزمة (jsdom + @testing-library/react + user-event + jest-dom) مُثبَّتة بالكامل — **لا حاجة لأي إعداد لإضافة اختبارات مكوّنات.**

### 7.2 الواقع — هيكلي 🔴

| المقياس | القيمة |
|---|---|
| ملفات الاختبار | 4 (كلّها في `src/test/`) |
| الاختبارات | 54 `it()` عبر 12 `describe` — **كلّها تنجح** |
| الوحدات المُغطّاة | 4 من 42 ملفًا في `src/utils` فقط |
| اختبارات المكوّنات/الصفحات/API/hooks | **0** |
| `render()` من @testing-library/react | مُستورَد في **صفر** ملف اختبار |
| `vi.mock`/`vi.fn`/`vi.spyOn` أو MSW | **0** (لا طبقة محاكاة شبكة) |
| التغطية التقديرية | ~0.5% من 753 ملفًا |

**ما يُختبَر (عالي القيمة رغم قلّته):**

- `dashboardAccess.test.ts` (19) — توجيه RBAC والأدوار (الأصل الأمني الأهم).
- `notificationRoutes.test.ts` (15) — تعقيم مسارات الإشعارات (يحجب URLs خارجية / مسارات api).
- `statusLabels.test.ts` (15) — تخطيط تسميات الحالات.
- `enrollmentMerge.test.ts` (5) — دمج تسجيلات الطالب.

**الفجوات الكبرى:** ~570 مكوّن `.tsx`، ~120 صفحة lazy، `AuthContext`، طبقة axios، الخطافات المخصّصة، والخدمات — **بلا أي اختبار**. تدفّقات حرجة (إعادة توجيه تسجيل الدخول، `ProtectedRoute`/`DashboardAccessGuard`، التسجيل، المدفوعات، معالجات النماذج) مُختبَرة في مساعداتها فقط لا في توصيلها (wiring). الخطر: **ثقة زائفة من مجموعة رفيعة.**

### 7.3 استراتيجية اختبار مُقترَحة

1. **أساس المحاكاة:** أدخِل **MSW** لعميل axios حتى تُختبَر طبقة البيانات والمكوّنات المعتمِدة عليها بشكل حتمي.
2. **التوصيل الأمني الحرج أولًا:** اختبارات تكامل لـ `ProtectedRoute` و`DashboardAccessGuard` و`AuthContext` (تسجيل/خروج/انتحال/إعادة توجيه ما بعد الدخول).
3. **أعقد النماذج:** `EnrollmentForm`، معالج النماذج، `SubmissionReviewPanel`.
4. **smoke render** لكل مسار أعلى-مستوى (مسار دخان واحد على الأقل لكل صفحة).
5. **مُزوِّد التغطية:** ثبّت `@vitest/coverage-v8` وأصلِح `test:coverage`؛ ضَع هدفًا أوّليًا واقعيًا (مثلًا 30% على `utils` + التوصيل الحرج) وارفعه تدريجيًا.

مثال هيكلي لاختبار حارس (باستخدام البنية المُهيّأة سلفًا):

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
// يلفّ المسار بمستخدم منتحَل ويؤكّد إعادة التوجيه/المنع
```

---

## 8. غياب CI/CD — وخطة الإضافة

🔴 **لا يوجد أي تكوين CI في المستودع إطلاقًا:** لا `.github/`، ولا `.gitlab-ci.yml`، ولا `Jenkinsfile`، ولا `.husky/`.

النتيجة: الاختبارات الـ54، و`eslint` (الذي **يفشل حاليًا** بأخطاء حقيقية)، و`tsc`، والبناء — كلّها تُشغَّل يدويًا فقط على جهاز مطوِّر يعمل على Windows. **لا شيء يمنع** دمج commit يكسر البناء أو يفشل lint أو يكسر الاختبارات الناجحة.

هذا **أعلى الإصلاحات رافعةً** لأنّ `lint` يفشل بالفعل — أي بوّابة CI ستلتقط ذلك فورًا.

### خطة الإضافة (GitHub Actions)

أضِف `.github/workflows/ci.yml` يُشغِّل البوّابات الأربع على PRs نحو `dev`/`main`:

```yaml
name: CI
on:
  pull_request:
    branches: [dev, main]
  push:
    branches: [dev, main]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint          # بوّابة lint (تفشل حاليًا — أصلِح الأخطاء الثلاثة أولًا)
      - run: npx tsc -b            # بوّابة الأنواع
      - run: npm test              # بوّابة الاختبارات (54 اختبارًا)
      - run: npm run build         # بوّابة البناء
      - run: npm audit --audit-level=high   # بوّابة الأمن (راجع تقرير الأمن: 3 ثغرات HIGH)
```

ملاحظات تطبيقية:

- لأنّ `lint` يفشل اليوم، إمّا أن تُصلَح أخطاؤه الثلاثة السلوكية **قبل** تفعيل البوّابة، أو تُشغَّل مؤقتًا بـ `continue-on-error: true` مع مهمة تتبُّع لإزالتها — لا تترك البوّابة معطَّلة دائمًا.
- بوّابة `npm audit --audit-level=high` تمنع انحدار الأمن (المستودع به vite/undici/form-data بخطورة HIGH، كلّها قابلة للإصلاح بـ `npm audit fix`).
- يمكن لاحقًا إضافة `.husky/pre-commit` لتشغيل `lint-staged` محليًا، لكن CI على الخادم هو خطّ الدفاع الأساسي.

---

## 9. التوصيات (مُرتَّبة بالأولوية)

- [ ] 🔴 **أضِف خط CI/CD (GitHub Actions)** بأربع بوّابات: `lint` + `tsc -b` + `test` + `build` + `npm audit` — أعلى رافعة فورية لأنّ lint يفشل بالفعل.
- [ ] 🔴 **استبدِل `public/favicon.svg`** (493KB raster) بـ favicon صغير حقيقي (SVG متجه أو PNG/ICO بضعة KB) — أثقل أصل في أول رسم.
- [ ] 🔴 **فعِّل `strict` (أو `strictNullChecks` كبداية)** في `tsconfig.app.json`، وعالِج الأخطاء الناتجة على دفعات.
- [ ] 🔴 **ابنِ تغطية اختبار للتوصيل الأمني الحرج** (`ProtectedRoute`, `DashboardAccessGuard`, `AuthContext`) + أدخِل MSW؛ البنية التحتية جاهزة بالفعل.
- [ ] 🟠 **أصلِح أخطاء ESLint الثلاثة السلوكية:** `SessionCard.tsx:47` (Date.now في render)، `Department/ExecutiveSection` (static-components)، `HomeCourseCard.tsx:119` (`\|\| true`)؛ ثم `eslint --fix` للباقي وافصل تصديرات `react-refresh`.
- [ ] 🟡 **قلِّص حزمة `vendor` تحت 500KB:** أضِف مدخلات `manualChunks` لـ `react-select`/`react-helmet-async`/`libphonenumber-js`/`i18n-iso-countries`/`browser-image-compression`.
- [ ] 🟡 **أصلِح `test:coverage`:** ثبّت `@vitest/coverage-v8`، وضَع هدف تغطية أوّليًا قابلًا للزيادة.
- [ ] 🟡 **أزِل الاعتماديات الميّتة** `sonner` و`i`، ونظِّف قاعدة `vendor-toast` الميّتة من `manualChunks`.
- [ ] 🟢 **راقِب `index.css`** (40KB gzip مقبول)، وتأكّد من ضِيق globs محتوى Tailwind لمنع الانتفاخ مع نمو التطبيق.
- [ ] 🟢 **حافِظ على المكاسب القائمة:** code-splitting (182 lazy)، dynamic import لـ pdf-lib/Sentry، و`manualChunks` — هذه أصول حقيقية تُصان لا تُعاد كتابتها.

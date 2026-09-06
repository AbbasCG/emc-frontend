# التقرير 07 — تجربة المستخدم، التصميم، التعريب، إمكانية الوصول، وRTL

الغرض: تقييم احترافي لنظام التصميم وجودة تطبيق RTL وفجوة التعريب (i18n) وإمكانية الوصول (a11y) وتحسين محركات البحث (SEO) والخطوط والحركة في تطبيق `emc-frontend`.

آخر تحديث: 2026-06-21 · الفرع: dev

---

## 0. الخلاصة التنفيذية

`emc-frontend` تطبيق ناضج بصريًّا وعالي الإتقان، عربيّ أوّلًا (Arabic-first) بنظام تصميم (design system) حقيقي ومدروس على مستوى الـtokens. غير أن هذه الواجهة الأنيقة تخفي ثلاث فجوات بنيوية كبيرة:

1. **لا توجد طبقة تعريب (i18n) إطلاقًا.** المنتج أحادي اللغة (عربي فقط) رغم ادّعاء `README` دعم EN/NL/AR. لا توجد مكتبة i18n ولا دالّة ترجمة `t(`، والنصوص مكتوبة عربيّة مباشرة (hardcoded) في **545 من 752** ملفًّا.
2. **اتجاه الصفحة (RTL) مثبّت يدويًّا** عبر 386 سمة `dir="rtl"` نصّيّة وصفر خصائص CSS منطقية (logical properties) — أي إنّ التحويل إلى LTR شبه مستحيل بنيويًّا.
3. **إمكانية الوصول لها أساس قويّ لكن مُقوَّض** بنوافذ منبثقة (modals) مكتوبة يدويًّا بلا حصر تركيز (focus trap)، وملتقطات تاريخ/وقت لا تعمل بلوحة المفاتيح، ولون علامة تجارية برتقالي (#EC943C) يفشل في معيار التباين WCAG AA في 187 موضعًا.

النواحي الإيجابية حقيقية وتستحق الإقرار: نظام tokens محكم (مقاييس ألوان للعلامة، ظلال مُعايَرة، z-index مُوحَّد)، أداة `cn()` (clsx + tailwind-merge) مُعتمَدة في ~77 ملفًّا، ضاغط صور `compressImage.ts` بمستوى إنتاجي، ونافذة `ConfirmDialog` نموذجية مبنية على `<dialog>`/`showModal()` الأصلي. الدَّيْن هنا هو **اتساق وإمكانية وصول وتعريب**، وليس صحّة وظيفية: الـTypeScript يُترجَم نظيفًا والبناء ناجح.

| المحور | التقييم | أبرز ملاحظة |
|---|---|---|
| نظام التصميم (tokens/shadows) | 🟢 ناضج | لكن جيلان متوازيان من الـprimitives (App* مقابل Emc*) + 75 لون hex خام في 17 من 28 ملف ui |
| تطبيق RTL | 🟠 يعمل لكنه هشّ | 386 `dir="rtl"` يدويّة + صفر خصائص منطقية = غير قابل للتبديل |
| التعريب (i18n) | 🔴 غائب كليًّا | لا مكتبة، 0 استدعاء `t(`، 545 ملفًّا فيها نصوص عربية ثابتة |
| إمكانية الوصول (a11y) | 🟠 أساس قويّ مُقوَّض | 937 سمة aria، لكن modals/pickers بلا keyboard، تباين لوني فاشل ×187 |
| SEO | 🟡 جزئيّ | `PublicSeo` على 8 من 229 صفحة فقط، og:locale مثبّت ar_AR |
| الخطوط | 🟡 يحجب العرض | 3 استيرادات `@import` لخطوط Google على المسار الحَرِج بلا preconnect |
| الحركة (motion) | 🟡 تتجاهل التفضيل | framer-motion في 311 ملفًّا، `useReducedMotion` في ملفّين فقط |

---

## 1. نضج نظام التصميم (Design System)

### 1.1 طبقة الـTokens — أصل قويّ 🟢

`tailwind.config.js` يضمّ نظام tokens فعليًّا ومُعايَرًا، وهو من أقوى أصول المشروع:

- **مقاييس ألوان كاملة 50–950**: `brand` (500 = `#2691C2`)، `accent` (500 = `#EC943C`)، `ink` (500 = `#22334A`)، `muted` (500 = `#737778`) — `tailwind.config.js:24-76`.
- **أسماء مستعارة قديمة محفوظة** للتوافق الخلفي: `customBlue`/`customOrange`/`deepBlue`/`emcBg` — `tailwind.config.js:18-21`.
- **نظام ارتفاع/ظلال مُعايَر**: `shadow-emc-xs..xl` + `emc-glow`/`emc-glow-accent`/`emc-ring`/`kpi` — `tailwind.config.js:94-106`.
- **تدرّجات وأنماط خلفية**: `brand/accent/ink-gradient`، `emc-grid/dots/radial/hero/shimmer` — `tailwind.config.js:108-125`.
- **منحنيات حركة (easings)**: `ease-emc`/`emc-spring`/`emc-out` + keyframes (`fade-in-up`/`shimmer`/`soft-float`/`glow-pulse`) — `tailwind.config.js:134-174`.
- **مقياس z-index مُوحَّد** بين `tailwind.config.js:177-185` ومتغيّرات `:root` في `index.css` (`--z-*`) — تصميم نظيف يمنع تضارب الطبقات.
- **عائلات خطوط مُعرَّفة**: `sans` (Tajawal — عربي أوّلًا)، `latin` (Inter للأرقام/الكود)، `display`، `mono` — `tailwind.config.js:79-86`.

أداة `cn()` (في `src/lib/utils.ts` = `twMerge(clsx(...))`) هي الطريقة الصحيحة لدمج الأصناف بحيث يستطيع المستهلِك تجاوُز الافتراضات، وهي مُعتمَدة في **~77 ملفًّا**.

### 1.2 طبقة المكوّنات — هجرة لم تكتمل 🟠

النظام يشحن **جيلين متوازيين متعارضين** من الـprimitives جنبًا إلى جنب:

| البدائيّة | الجيل القديم (App*) | الجيل الجديد (Emc*/premium) | المشكلة |
|---|---|---|---|
| الزرّ | `AppButton.tsx` (لون بُنّيّ `#b9872f`، `isLoading`) | `EmcButton.tsx` (أزرق العلامة، 8 variants + أحجام، `loading`) | أسماء props مختلفة + ألوان accent متعارضة |
| عنوان القسم | `AppSectionHeader.tsx` | `SectionHeading.tsx` + `shared/SectionHeader.tsx` + `sections/SectionHeader.tsx` | **أربعة** ملفّات لعنوان قسم واحد |
| بطاقة الإحصاء | `shared/StatCard.tsx` | `ui/StatTile.tsx` | تداخُل وظيفيّ |

- `ui/index.ts` يُصدِّر الجيل الجديد فقط (EmcButton, FormField, DashboardPageShell, ApiErrorAlert, Surface, Eyebrow, StatTile, SectionHeading)؛ مجموعة App* **ليست** في الـbarrel، ما يدفع مواقع الاستدعاء للاختيار العشوائي ويضمن انحرافًا بصريًّا.
- اللون `#b9872f` المستخدَم في الجيل القديم لون **بُنّيّ خارج لوحة الألوان كليًّا** (accent العلامة هو `#EC943C`)، فيظهر نفس «الـaccent» بلونين مختلفين بين مكوّنات شقيقة (مثال: خطّ `SectionHeading` السفليّ `bg-customOrange` مقابل `AppSectionHeader` بـ`bg-[#b9872f]`).

### 1.3 ملتقطات التاريخ/الوقت المخصّصة

`EmcDatePicker` / `EmcTimePicker` / `EmcDateTimePicker` — ملتقطات تقويم/وقت مكتوبة يدويًّا، عربيّة أوّلًا (أرقام `latn`)، بإعدادات مسبقة (اليوم/غدًا/+أسبوع، +30د/+ساعة/+ساعتين) وتدفّق «مسوَّدة ثمّ تأكيد»، تُعرَض عبر `DropdownPortal`. الأخير primitive صلب (تموضُع ثابت، تقييد بإطار العرض، قلب/flip، إعادة تموضُع عند التمرير/التحجيم، إغلاق عند النقر خارجه). لكنّها تعاني من فجوات a11y جسيمة (انظر القسم 4.3) ومن غياب دعم `min`/`max`/`disabledDate` (انظر 4.6).

### مشكلات نظام التصميم

| # | الخطورة | المشكلة | الموضع |
|---|---|---|---|
| DS-1 | 🟠 | جيلان متعارضان من primitives الزرّ/العنوان/الإحصاء (هجرة غير مكتملة) | `AppButton` مقابل `EmcButton`؛ 4 ملفّات SectionHeader؛ `StatCard` مقابل `StatTile` |
| DS-2 | 🟡 | 75 لون hex خام في 17 من 28 ملف ui، منها بُنّيّ `#b9872f` خارج اللوحة | `EmcDateTimePicker.tsx` (23)، `EmcDatePicker.tsx` (14)، `EmcTimePicker.tsx` (13)؛ `#b9872f` في `AppButton.tsx:30,34` وغيره |
| DS-3 | 🟡 | 7 مكوّنات ما زالت تستخدم `.join(' ')` بدل `cn()` فتنكسر دلالات تجاوُز className | `AppButton.tsx:50-57`، `AppSelect.tsx:64-70`، `AppFileUpload.tsx:245-252`، `AppCard`، `AppCheckboxGroup`، `AppRadioGroup`، `ApiErrorAlert` |
| DS-4 | 🟡 | اصطلاحات focus-ring غير متسقة (amber مقابل brand مقابل `.emc-focus-ring`) | `AppInput.tsx:100-101`، `AppSelect.tsx:67-68` مقابل `EmcButton.tsx:82`، `EmcDatePicker.tsx:126` |
| DS-5 | 🟡 | مكتبتا toast: `sonner` تابعة لكن غير مُستورَدة (0 استيراد) — وزن ميّت | `package.json`؛ المُستخدَم فعليًّا `react-hot-toast` |

---

## 2. جودة تطبيق RTL

التطبيق **عربيّ/RTL فقط**. الإيجابيّ أنّ الاتجاه مُطبَّق باتّساق على مستوى المكوّنات، والحقول الرقمية/الأكواد مُحوَّلة عمدًا إلى LTR (170 `dir="ltr"`) — أي إنّ اتجاهيّة التواريخ والأكواد دُرِست. لكن الأسلوب هشّ وعالي الصيانة:

- **386 سمة `dir="rtl"` نصّيّة** مكرَّرة على العناصر بدل وراثتها من الجذر — `src/components/Layout.tsx:10` يضبط `dir="rtl"` على غلاف التطبيق.
- **صفر خصائص CSS منطقية** في `src/index.css` (لا `margin-inline`/`padding-inline`/`inset-inline`/`start`/`end`)؛ التخطيط فيزيائيّ بالكامل، مع اختراق مرآة وحيد لأيقونة chevron-left في `index.css:319`.
- `index.html:2` يثبّت `<html lang="ar" dir="rtl">` بعنوان عربيّ، ولا يوجد كود يضبط `documentElement.lang`/`dir` ديناميكيًّا (`src/utils/currency.ts:19` يقرأ `documentElement.lang` فقط ولا يكتبه).

**الأثر:** تبديل الاتجاه إلى LTR لأيّ لغة لاتينية سيُسبِّب انعكاسًا خاطئًا للمسافات والمحاذاة والأيقونات في كلّ مكان، لأنّ كلّ شيء فيزيائيّ ومثبّت يدويًّا. تطبيق RTL وفجوة i18n مترابطان: لا يمكن حلّ أحدهما دون الآخر.

| # | الخطورة | المشكلة | الموضع |
|---|---|---|---|
| RTL-1 | 🟠 | RTL يعتمد على 386 `dir="rtl"` يدويّة وصفر خصائص منطقية — غير قابل للتبديل وعالي الصيانة | `src/` (386 `dir="rtl"`, 170 `dir="ltr"`)؛ `src/index.css` (0 logical)؛ `index.css:319` |

**الإصلاح المقترح:** اضبط `dir` مرّة واحدة في الجذر من حالة اللغة، واحذف `dir="rtl"` لكلّ عنصر (مع إبقاء `dir="ltr"` فقط على الأرقام/الأكواد المعزولة)، وهاجِر أدوات التباعد/التموضُع إلى نظيراتها المنطقية (`ps-`/`pe-`/`ms-`/`me-`، `start-`/`end-`) كي يُنتج قلب `dir` واحد تخطيطًا صحيحًا.

---

## 3. التعريب (i18n) — الادّعاء مقابل الواقع 🔴

### 3.1 الواقع: لا توجد طبقة تعريب على الإطلاق

| الحقيقة | الدليل |
|---|---|
| لا مكتبة i18n | `package.json` لا يحوي أيًّا من i18next/react-i18next/react-intl/formatjs/lingui |
| لا دالّة ترجمة | بحث `t('` في `src/` = **0 نتيجة** |
| نصوص عربية ثابتة منتشرة | **545 من 752** ملفًّا فيها أحرف عربية (مثال: `SemanticSearchModal.tsx:11-18`, `ConfirmDialog.tsx:21-22`) |
| اللغة مثبّتة في HTML | `index.html:2` = `<html lang="ar" dir="rtl">`؛ لا كود يغيّرها |
| لا مبدّل لغة | المُبدّل الوحيد هو `src/components/forms/CountrySelect.tsx` (لاختيار رمز الهاتف فقط) |

**ادّعاء `README` بدعم EN/NL/AR غير صحيح في الواقع الحاليّ.** كلّ تسمية وplaceholder وaria-label ورسالة خطأ هي نصّ عربيّ مكتوب مباشرةً ومبعثَر في مئات الملفّات.

### 3.2 ماذا يتطلّب تبنّي i18n؟

هذا جهد كبير لأنّ النصوص متغلغلة في 545 ملفًّا والاتجاه فيزيائيّ. خطوات مقترَحة عمليًّا:

1. **تبنّي `react-i18next`** (الأنسب لـReact 19 + Vite).
2. **إنشاء كتالوج رسائل** بالعربية (`ar`) كلغة مصدر، ثمّ EN/NL تباعًا.
3. **مزوّد لغة `LanguageProvider`** يضبط `documentElement.lang` و`dir` عند تغيير اللغة، ويقود `<html dir>` من الحالة، مع حذف `dir="rtl"` الثابتة (انظر RTL-1).
4. **هجرة النصوص تدريجيًّا عبر codemod**، بدءًا من `shared/ui` + `nav` + الصفحات العامة.
5. **معاملة EN/NL كبند خارطة طريق**، لا كقدرة حاليّة.

| # | الخطورة | المشكلة | الموضع |
|---|---|---|---|
| I18N-1 | 🔴 | لا طبقة i18n إطلاقًا؛ نصوص ثابتة في 545 ملفًّا؛ ادّعاء EN/NL/AR في README غير صحيح | `package.json` (لا تابع)؛ `src/**/*.tsx` (545)؛ `t(` = 0 |
| I18N-2 | 🔴 | اللغة والاتجاه مثبّتان في `index.html`؛ لا تبديل لغة/اتجاه ممكن وقت التشغيل | `index.html:2`؛ `src/components/Layout.tsx:10`؛ `src/utils/currency.ts:19` |

---

## 4. تدقيق إمكانية الوصول (Accessibility)

### 4.1 الأساس القويّ الموجود فعلًا 🟢

- **رابط تخطّي (skip link)** عربيّ في `Layout.tsx:29-34` (focus-visible، يؤدّي إلى `#main-content` بـ`tabIndex=-1`).
- **937 سمة `aria-*`** و72 سمة `role=` عبر التطبيق.
- **معالم دلاليّة (landmarks)** سخيّة: `<main>` ×39، `<nav>` ×25، `<header>` ×47، `<footer>` ×4.
- **أدوات `.sr-only`/`.sr-only-focusable`** (`index.css:111-129`) وحلقة `:focus-visible` معرَّفة (`index.css:104`) — لا `outline:none` أعمى.
- **`ConfirmDialog.tsx` نموذجيّ**: مبنيّ على `<dialog>`/`showModal()` الأصلي، يوفّر حصر تركيز + Escape + خلفية + `aria-labelledby`/`aria-describedby` + معالجة `onCancel` — لكنّه النافذة **الوحيدة** التي تفعل ذلك.
- **إعادة ضبط CSS لتقليل الحركة** (`index.css:322-331`)، و`useReducedMotion` في `HomeAiSection.tsx` و`HomeCinematicHero.tsx`.

### 4.2 النوافذ المنبثقة (Modals) — بلا حصر تركيز ولا Escape 🟠

معظم الـmodals عبارة عن portal + framer-motion overlay. `SemanticSearchModal.tsx:56-145` بلا `role="dialog"`/`aria-modal`، بلا حصر تركيز، بلا Escape للإغلاق، ولا يُعيد التركيز إلى المُشغِّل عند الإغلاق — فيستطيع مستخدمو لوحة المفاتيح وقارئ الشاشة الخروج (tab) خلف الطبقة. من ~9 نوافذ، تُعالَج Escape في 4 ملفّات فقط (`DashboardRouteSearchModal`, `Navbar`, `DropdownPortal`, `VolunteerRequestDetailModal`)، ولا توجد مكتبة focus-trap في المستودع إطلاقًا.

**الإصلاح:** توحيد النوافذ على نمط `<dialog>`/`showModal()` من `ConfirmDialog` (أو إضافة غلاف focus-trap مشترك) كي تنال كلّ نافذة حصر التركيز وEscape وaria-modal واستعادة التركيز تلقائيًّا.

### 4.3 ملتقطات التاريخ/الوقت — لا تعمل بلوحة المفاتيح 🟠

الملتقطات الثلاثة تعرض نوافذ `role="dialog"` لكن **صفر** معالجة `onKeyDown` في كامل `src/components/ui`. تفاصيل:

- `DropdownPortal` يُغلَق فقط بالنقر خارجه — لا بـEscape ولا عند مغادرة التركيز للنافذة.
- شبكة التقويم قائمة مسطّحة من `<button>` بلا roving tabindex ولا تنقّل بأسهم الاتجاه، وبلا `role="grid"/gridcell`/`aria-selected`.
- النوافذ تفتقر إلى `aria-modal` وإلى نقل التركيز عند الفتح.

هذه مُدخَلات أساسية في تدفّقات جدولة المدرّبين والورش، فالعجز يمنع مستخدمي لوحة المفاتيح/قارئ الشاشة من العمل بها.

**الإصلاح:** إضافة معالج Escape + (اختياريًّا) حصر تركيز واستعادته في `DropdownPortal`؛ ومنح شبكة التقويم roving tabindex مع `ArrowLeft/Right/Up/Down` + `Home/End` (و`role=grid/row/gridcell`)؛ وضبط `aria-modal` ونقل التركيز عند الفتح. يُفضَّل استخراج خطّاف مشترك `usePickerKeyboard` تشترك فيه الملتقطات الثلاثة.

### 4.4 الزاوية a11y لخطأ static-component في فريق العمل 🟡

`DepartmentSection.tsx:22,39` و`ExecutiveSection.tsx:16,23` يبنيان مكوّنًا أثناء التصيير (`const Icon = resolveDepartmentIcon(...)`) ما يُطلِق خطأ lint مؤكَّدًا `react-hooks/static-components`. الأثر العمليّ الحاليّ منخفض (الأيقونة مرجع مستقرّ من lucide)، لكنّه **نمط هشّ**: أيّ أيقونة ذات حالة مستقبلًا ستُعيد التركيب صامتةً وتُفقِد حالتها — وهو ما يضرّ بثبات تركيز قارئ الشاشة على عناصر الفريق. كما أنّه خطأ يحجب الـCI. الإصلاح: التصيير عبر مكوّن صغير يأخذ مفتاح الأيقونة prop ويحلّها داخليًّا (مُعرَّفًا في نطاق الوحدة).

### 4.5 مخاطرة التباين اللونيّ — #EC943C على أبيض 🟠

اللون البرتقاليّ للعلامة `customOrange = #EC943C` يُعطي تباينًا بنحو **~2.3:1 على خلفية بيضاء** — أدنى بكثير من عتبة WCAG AA البالغة 4.5:1 للنصّ العاديّ (و3:1 للنصّ الكبير/عناصر الواجهة). وهو مستخدَم **كلون نصّ في 187 موضعًا** (`text-customOrange`) في الشارات والنسب والروابط والتسميات، وكخلفية في 194 موضعًا (مع نصّ أبيض، وهو حدّيّ أيضًا). هذا فشل وصول منهجيّ على مستوى العلامة.

**الإصلاح:** قصر `#EC943C` على النصّ الكبير/العريض أو العناصر غير النصّيّة فقط؛ وإدخال token accent أغمق (نحو `~#B5650F`) للنصّ البرتقاليّ بحجم الجسم وللروابط؛ ومراجعة المواضع الـ187 مقابل AA.

### 4.6 ملاحظات a11y أخرى

- **نصّ بديل (alt) فارغ منتشر**: 16 من 18 وسم `<img>` في `home/public/impact` بـ`alt=""` (بعضها زخرفيّ مشروع، لكن صور المدرّبين/الدورات معلوماتيّة ويجب أن تصف المحتوى) — `HomeCourseCard.tsx:52`.
- **غياب `min`/`max`/`disabledDate`** في ملتقطات التاريخ يسمح باختيار تواريخ ماضية/خارج النطاق، ويدفع كلّ التحقّق إلى الخادم — `EmcDatePicker.tsx:58-64`.

| # | الخطورة | المشكلة | الموضع |
|---|---|---|---|
| A11Y-1 | 🟠 | نوافذ منبثقة بلا حصر تركيز/Escape/استعادة تركيز (الأصلي الوحيد ConfirmDialog) | `SemanticSearchModal.tsx:56-145`؛ Escape في 4 ملفّات فقط؛ لا مكتبة focus-trap |
| A11Y-2 | 🟠 | ملتقطات التاريخ/الوقت بلا تنقّل بلوحة المفاتيح على شبكة التقويم | `EmcDatePicker.tsx`، `EmcTimePicker.tsx`، `EmcDateTimePicker.tsx` |
| A11Y-3 | 🟠 | `#EC943C` كنصّ على أبيض (~2.3:1) يفشل WCAG AA في 187 موضعًا | `tailwind.config.js:19`؛ `text-customOrange` ×187 |
| A11Y-4 | 🟡 | static-component في render (Team) — خطأ lint + هشاشة a11y | `DepartmentSection.tsx:22,39`؛ `ExecutiveSection.tsx:16,23` |
| A11Y-5 | 🟡 | نصّ بديل فارغ في 16 من 18 صورة؛ ودعم reduced-motion ضعيف | `home/public/impact`؛ `HomeCourseCard.tsx:52` |

---

## 5. SEO عبر react-helmet-async 🟡

`react-helmet-async` مُهيّأ صحيحًا (`HelmetProvider` في `main.tsx`)، ومكوّن `PublicSeo.tsx` جيّد البناء حيث يُستخدَم: canonical ديناميكيّ عبر `window.origin` (مع احتياط `https://edumc.nl`)، وسوم OpenGraph + Twitter `summary_large_image` كاملة، وخيار `noIndex`. لكن:

- **مطبَّق على 8 من 229 صفحة فقط** (Home, Courses, Programs, Workshops, LearningPaths + 3 صفحات تفصيليّة). فكلّ صفحة معلوماتية — Departments, Team, Impact, Partnerships, Volunteer, Contact, InstructorDetail — تُشحَن **بلا `title`/description/canonical/OG**، وترث عنوان `index.html` الثابت، فتكون عمليًّا غير مرئيّة لمحرّكات البحث ومعاينات التواصل الاجتماعيّ.
- شجرة لوحة التحكّم/البوّابة/الإدارة بأكملها (~221 صفحة) بلا أيّ وسوم لكلّ صفحة.
- **SEO أحادي اللغة**: `og:locale` مثبّت `ar_AR` (`PublicSeo.tsx:48`) ووصف افتراضيّ عربيّ (`PublicSeo.tsx:4-5`)، بلا `hreflang` ولا `og:locale:alternate`.

**الإصلاح:** إضافة `<PublicSeo>` (أو Helmet خفيف بعنوان فقط) إلى كلّ صفحة عامّة على الأقلّ؛ و`InstructorDetail` يمرّر اسم المدرّب وصورته لـOG لكلّ مدرّب؛ ومتى وُجِد i18n، تُحلَّى العناوين/الأوصاف ويُضبَط `og:locale` من اللغة النشطة مع إصدار `hreflang`.

| # | الخطورة | المشكلة | الموضع |
|---|---|---|---|
| SEO-1 | 🟠 | لا meta/OG على أيّ صفحة معلوماتية (PublicSeo على 8 من 229 فقط) | `Departments/Team/Impact/Partnerships/Volunteer/Contact/InstructorDetail` |
| SEO-2 | 🟡 | SEO أحادي اللغة: `og:locale=ar_AR` ثابت، بلا hreflang/alternate | `PublicSeo.tsx:4-5,48` |

---

## 6. الخطوط (Tajawal وأخواتها) 🟡

ثلاثة خطوط محمَّلة عبر `@import url(...)` لخطوط Google على رأس `index.css:3-5` (Cairo + Tajawal + Inter):

- **حجب العرض على المسار الحَرِج**: الـ`@import` يوقف تحليل الـCSS ويجلب الخطوط من طرف ثالث، بلا `<link rel="preconnect">` إلى `fonts.gstatic.com` وبلا preload للخطّ العربيّ الأساس (Tajawal). هذا يؤخّر أوّل رسم للنصّ (FOIT/FOUT) لجمهور عربيّ أوّلًا.
- مكدّس الخطوط: Tajawal للعناوين، Inter + Tajawal للجسم (`tailwind.config.js:81,84`؛ `index.css:70,87`).

**الإصلاح:** نقل تحميل الخطوط إلى وسوم `<link>` في `index.html` مع preconnect إلى `fonts.gstatic.com` و`font-display:swap` (موجود أصلًا في الروابط)، أو استضافة Tajawal/Inter ذاتيًّا عبر `@fontsource` مع تقليم (subset) للعربية + اللاتينية لتقليل الحمولة وإزالة القفزة لطرف ثالث.

| # | الخطورة | المشكلة | الموضع |
|---|---|---|---|
| FONT-1 | 🟡 | 3 استيرادات `@import` لخطوط Google تحجب العرض، بلا preconnect/preload | `src/index.css:3-5` |

---

## 7. الحركة (Motion) — framer-motion وتقليل الحركة 🟡

framer-motion مستخدَم في **311 ملفًّا** (308 منها تستعمل `motion.`/`AnimatePresence`/`whileInView`)، لكن `useReducedMotion` مستخدَم في **ملفّين فقط** (`HomeAiSection.tsx`, `HomeCinematicHero.tsx`).

**المشكلة الجوهرية:** إعادة ضبط CSS لتقليل الحركة (`index.css:322-331`) تُعطِّل انتقالات/حركات CSS فقط، بينما framer-motion يحرّك عبر JavaScript (transform/opacity عبر requestAnimationFrame) ولا توقفه قاعدة CSS تلك. فمستخدمو خيار «تقليل الحركة» في النظام ما زالوا يتلقّون معظم الحركة (تلاشي الصفحات في `Layout.tsx:11-13`، ودخول النوافذ، وكشوف `whileInView`).

**الإصلاح (سطر واحد):** تغليف التطبيق بـ`<MotionConfig reducedMotion="user">` في `main.tsx`/`App` كي يحترم framer-motion إعداد النظام عالميًّا، بدلًا من `useReducedMotion` لكلّ مكوّن.

| # | الخطورة | المشكلة | الموضع |
|---|---|---|---|
| MOTION-1 | 🟡 | حركات framer-motion في 311 ملفًّا تتجاهل prefers-reduced-motion (مُحترَم في ملفّين فقط) | `src/` (311 ملفًّا)؛ `useReducedMotion` في 2؛ `index.css:322-331` |

---

## 8. التوصيات (مرتّبة حسب الأولوية)

أولًا — أساسات بنيوية (🔴 حرِجة):

- [ ] **توحيد الاتجاه على الجذر**: حقن `<MotionConfig reducedMotion="user">` (سطر واحد، يحلّ MOTION-1 فورًا) ثمّ ضبط `dir`/`lang` على `<html>` من حالة لغة، تمهيدًا لإزالة الـ386 `dir="rtl"` (RTL-1, I18N-2). [MOTION-1, I18N-2, RTL-1]
- [ ] **اتّخاذ قرار i18n استراتيجيّ**: تبنّي `react-i18next` ببنية كتالوج `ar` كمصدر، وبدء هجرة `shared/ui` + `nav` + الصفحات العامة عبر codemod؛ ومعاملة EN/NL كبند خارطة طريق وتصحيح ادّعاء README. [I18N-1]

ثانيًا — إمكانية وصول مؤثّرة (🟠 مهمّة):

- [ ] **إصلاح التباين اللونيّ**: إدخال token برتقاليّ أغمق (~`#B5650F`) للنصّ والروابط، ومراجعة 187 موضع `text-customOrange`. [A11Y-3]
- [ ] **توحيد النوافذ** على نمط `<dialog>`/`showModal()` من `ConfirmDialog` لنيل حصر التركيز وEscape وaria-modal واستعادة التركيز. [A11Y-1]
- [ ] **إتاحة لوحة المفاتيح في الملتقطات**: Escape في `DropdownPortal`، وroving tabindex + أسهم اتّجاه + `role=grid` في شبكة التقويم. [A11Y-2]
- [ ] **إضافة `PublicSeo`** إلى كلّ صفحة عامّة (Departments/Team/Impact/Partnerships/Volunteer/Contact/InstructorDetail). [SEO-1]

ثالثًا — نضج نظام التصميم (🟠/🟡):

- [ ] **إنهاء هجرة الـDesign System**: اعتماد جيل Emc*/Surface قاعدةً، وإهلاك App* (أو جعلها re-exports رفيعة)، وطيّ ملفّات SectionHeader الأربعة في واحد. [DS-1]
- [ ] **إزالة الـhex الخام** من `components/ui` (75 موضعًا) واستبدالها بأصناف الـtokens؛ وحذف البُنّيّ `#b9872f`؛ وإضافة قاعدة lint تمنع الـhex. [DS-2]
- [ ] **توحيد تركيب الأصناف على `cn()`** في الـ7 مكوّنات المتبقّية، وتوحيد focus-ring على `.emc-focus-ring`. [DS-3, DS-4]

رابعًا — تنظيف وتحسين (🟡):

- [ ] إزالة `sonner` غير المستخدَمة من الاعتماديّات. [DS-5]
- [ ] تحميل الخطوط عبر `<link>` + preconnect (أو استضافة ذاتية عبر `@fontsource` مع subset). [FONT-1]
- [ ] إصلاح خطأ static-component في `Team` (يحلّ خطأ lint وهشاشة a11y معًا). [A11Y-4]
- [ ] منح الصور المعلوماتية نصًّا بديلًا وصفيًّا (عنوان الدورة/اسم المدرّب). [A11Y-5]
- [ ] إضافة `min`/`max`/`disabledDate` لملتقطات التاريخ في تدفّقات الجدولة.
- [ ] متى وُجِد i18n: تحلية SEO وإصدار `hreflang` و`og:locale` من اللغة النشطة. [SEO-2]

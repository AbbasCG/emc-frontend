# 🎨 دليل نظام التصميم V3 — للمطوّرين

> **الغرض:** أن يبني مطوّر جديد واجهةً مطابقةً لهوية EMC **دون قراءة كتيّب الهوية**، ودون تخمين لون أو خط.
> المرجع الحاكم (الجهة الفنّية): [`brand/EMC_Brand_Master.v3.md`](brand/EMC_Brand_Master.v3.md) — **عند أي تعارض، الكتيّب هو الحكم**.
> الاصطلاحات العامة للكود: [`conventions.md`](conventions.md) · المؤثّرات: [`effect-patterns.md`](effect-patterns.md)

---

## 0) القاعدة الواحدة

> **لا لون خام في مكوّن. أبداً.** كل لون يأتي من token في `tailwind.config.js`.

هذا **مُنفَّذ آلياً** منذ M7.C — انظر §7. `text-[#0C2A4B]` في ملف جديد = بناء فاشل.

```tsx
// ❌ يفشل في ESLint وفي npm run check:brand
<h2 className="text-[#0C2A4B]">عنوان</h2>

// ✅
<h2 className="text-navy">عنوان</h2>
```

---

## 1) الألوان — الـtokens

### بحر المعرفة (العائلة الأساسية)

| Token | القيمة | الاستعمال |
|---|---|---|
| `night` / `brand-900` | `#06182C` | أعمق سطح داكن |
| `navy` / `brand-800` / `deepBlue` | `#0C2A4B` | العناوين على فاتح · الأسطح الداكنة |
| `ocean` / `brand-600` | `#0E5A8A` | حالات hover على الأزرق |
| `customBlue` / `brand-500` | `#0077B6` | **الأزرق الأساسي — آمن كنص على فاتح (AA)** |
| `sky` / `brand-400` | `#089FE0` | تمييز بصري · **ليس نصاً على فاتح** |
| `ice` / `brand-200` | `#A6D6F2` | خلفيات وحدود فاتحة |

> `primary-*` **alias لـ`brand-*`** (صفحات المعهد من دفعة الفريق تعتمده) — القيم متطابقة.

### نار الشغف (اللهجة)

| Token | القيمة | الاستعمال |
|---|---|---|
| `amber` / `accent-300` | `#FFA733` | عنبر · تحذيرات |
| `customOrange` / `accent-500` | `#F28C00` | **البرتقالي الأساسي — أسطح وأزرار فقط، ليس نصاً على فاتح** |
| `ember` / `accent-700` | `#C97208` | **البديل الآمن: برتقالي كنص/رابط على فاتح (AA)** |
| `sand` / `accent-100` | `#FCE9D2` | خلفية دافئة |

### وظيفية ومحايدة

`success` `#1B7F4B` · `warning` `#FFA733` · `danger` `#B3401E`
`paper` `#FBFAF7` (خلفية الصفحة) · `paper2` `#F3F1EA` · `line` `#E7E3DA` (الحدود) · `foreground` `#27384B` (نص الجسم)
سلالم كاملة: `ink-50…900` (حبر مؤسسي) · `muted-50…900` (رمادي وظيفي)

### ⛔ قوانين اللون الثلاثة (غير قابلة للتفاوض)

1. **لا مزج بحر ↔ نار في تدرّج واحد.** استخدم `bg-brand-gradient` (بحر) أو `bg-accent-gradient` (نار) — لا تؤلّف تدرّجاً يخلطهما.
2. **السماوي `sky` والبرتقالي `customOrange` ليسا نصاً على خلفية فاتحة.** للنص استخدم `navy` · `customBlue` · `ember`.
3. **الشعار مقفول** — لا `invert` بالـCSS ولا إعادة تلوين. اختر الملف الصحيح (§5).

---

## 2) الخطوط

| Class | العائلة | متى |
|---|---|---|
| `font-sans` | Thmanyah Sans → IBM Plex Sans Arabic | **الافتراضي**: الجسم، الواجهة، **وكل الأرقام** |
| `font-display` | Thmanyah Serif Display | العناوين الكبيرة والأغلفة |
| `font-serif` | Thmanyah Serif Text | المتون الطويلة (كتيّبات) |
| `font-mono` | IBM Plex Mono | الكود والمعرّفات |

- **الأرقام لاتينية 0–9 دائماً وLTR.** للتواريخ العربية استخدم `ar-EG-u-nu-latn` — **لا `ar-SA`** (يُخرج أرقاماً هندية وتقويماً هجرياً).
- **بوابة الترخيص:** ملفات OTF المحلية في `public/fonts/thmanyah/` **خارج git عمداً** (`.gitignore` — لا تُزل السطر ولا تُودِع خطاً ولا تُشغّل subsetting قبل ورود الترخيص). ملفات `public/fonts/*.woff2` أودعها الفريق وسُلسلت في المكدّسات أعلاه.

---

## 3) تواقيع V3

> **حدّ أقصى توقيعان لكل مشهد.** أكثر من ذلك يُفقدها قيمتها.

| Class | ما هو |
|---|---|
| `.emc-tricolor` / `.emc-tricolor-on-dark` | الشريط الثلاثي (برتقالي 22% · سماوي 58% · فاتح) — 4px، واعٍ بالـRTL |
| `.emc-arc` | القوس المزدوج تحت العنوان — برتقالي فوق طبقة سماوية 0.45 |
| `.emc-ghost-num` | الأرقام الشبحية — Sans Black بـ`rgba(12,42,75,.05)` خلف ترقيم الأقسام |
| `.emc-pages-light` / `-dark` / `-gold` | باترن الأوراق المتطايرة (من الشعار) |
| `.emc-corner-pages` (+ `-white`) | شارة الأوراق في الزاوية السفلية |
| `.emc-dawn-field` | حقل الفجر — أقواس متحدة المركز بخفوت |
| `bg-emc-hero` | الفجر: توهّج سماوي + أفق برتقالي **بطبقات لا بمزج** |

---

## 4) المكوّنات القانونية

**استورد من البرميل الواحد:** `import { EmcButton, Surface, StatTile, SectionHeading } from '@/components/ui'`

| المكوّن | الغرض |
|---|---|
| `EmcButton` | الزر القانوني الوحيد |
| `Surface` | البطاقة/السطح (`variant` · `elevation` · `padding`) |
| `SectionHeading` (`SectionHeader` alias) | ترويسة القسم — **وُحِّدت من 4 نسخ إلى 1 في M2b** |
| `Eyebrow` | السطر الفوقي الصغير |
| `StatTile` | بطاقة رقم/KPI |
| `FormField` · `AppInput` · `AppSelect` · `AppTextarea` · `AppCheckboxGroup` · `AppRadioGroup` · `AppFileUpload` | الحقول |
| `DashboardPageShell` · `DashboardBreadcrumbs` | هيكل صفحة اللوحة |
| `ApiErrorAlert` · `AppAlert` · `AppBadge` | حالات ورسائل |
| `Skeleton` · `TableSkeleton` · `CourseCardSkeleton` | **هياكل تحميل — لا spinners عارية** |
| `EmcDatePicker` · `EmcTimePicker` · `EmcDateTimePicker` | التاريخ/الوقت (ملتقطات بلوحة مفاتيح كاملة) |

**قواعد:**
- **مكوّن واحد لكل غرض.** قبل كتابة مكوّن جديد، ابحث في `src/components/ui/` — الازدواج دَين.
- الظلال من مقياس `shadow-emc*` المُعايَر (`emc-xs` … `emc-xl` · `emc-glow` · `kpi`) — لا ظلال مرتجلة.
- التركيز: `.emc-focus-ring` (حلقة `customBlue` بإزاحة 2px). **لا تحذف حلقات التركيز.**
- **حالات فارغة** بنمط: أيقونة + عنوان + وصف + **فعل**.
- تركيب الأصناف عبر `cn()` من `@/lib/utils`.

---

## 5) الشعار

الأصول في `public/brand/logos/` — **اختر الملف، لا تعالج الصورة**:

| السياق | الملف |
|---|---|
| خلفية فاتحة | `logo_full_color.png` أو `logo_full_navy.png` |
| خلفية داكنة | `logo_full_white.png` |
| فوق صورة | `logo_full_white.png` + تعتيم كحلي **≥60%** |
| أيقونة فقط | `logo_icon_*.png` |

**الحد الأدنى:** 130px للشعار الكامل · 44px للأيقونة. **ممنوع:** `filter: invert()` · إعادة التلوين · التمطيط · إضافة تأثيرات.

---

## 6) RTL وا11y

- العربية هي المصدر، والاتجاه `rtl` يقوده `LanguageProvider` على `<html lang dir>`.
- استخدم الخصائص المنطقية: `inset-inline-start` · `ms-*`/`me-*` · `ps-*`/`pe-*` — **لا `left`/`right` ثابتة**.
- التدرّجات الاتجاهية تُكتب `to left` لتقرأ صحيحاً في RTL.
- **a11y إلزامي:** كل مكوّن جديد يحمل تأكيد `axe` في اختباره (`src/test/axe.ts`, WCAG 2.1 A/AA). النوافذ: دلالات `dialog` + فخّ تركيز (`useFocusTrap`) + Escape + استعادة التركيز للفاتح.
- لا تكسر `prefers-reduced-motion`؛ عتبات `whileInView` تمرّ عبر `viewportOnce` المشترك (عتبات كسرية على حاويات طويلة **لا تُفعَّل أبداً** على 375px — درس M5.5).

---

## 7) البوابات الآلية (ما الذي سيوقفك)

| الأمر | ما يمنعه |
|---|---|
| `npx eslint .` | hex خام في أي ملف نظيف · `set-state-in-effect` · `react-refresh` |
| `npm run check:brand` | hex خام في ملف جديد · نمو الـhex في ملف قديم |
| `npm run typecheck:strict` | أخطاء الأنواع تحت `strict` |
| `npm test` | الوحدات + axe + عتبات التغطية لكل مجلد |
| `npx playwright test` | الرحلات + لوحات الأدوار + الألبوم (حاسوب + جوّال 375px) |
| `npm run check:secrets` | اعتماديات مسرَّبة · `console.*` غير محروس |
| `npm run check:bundle` | تجاوز ميزانية 250KB gz للحزمة الأوّلية |

**عندك لون جديد فعلاً؟** أضِف **token** في `tailwind.config.js` — لا literal في المكوّن.
**نظّفت hex قديماً؟** ثبّت المكسب: `node scripts/check-raw-hex.mjs --update`.

---

## 8) ممنوعات سريعة

- ⛔ hex خام في مكوّن · ⛔ مزج بحر↔نار في تدرّج · ⛔ سماوي/برتقالي نصاً على فاتح
- ⛔ تعديل الشعار بأي شكل · ⛔ commit ملفات خط قبل بوابة الترخيص
- ⛔ أرقام/أسعار/روابط/هواتف **غير مؤكَّدة من المؤسس** في أي سطح عام — غير المؤكَّد يبقى مخفياً
- ⛔ spinner عارٍ مكان skeleton · ⛔ حالة فارغة بلا فعل · ⛔ حذف حلقة تركيز
- ⛔ `ar-SA` للتواريخ · ⛔ `left`/`right` ثابتة
- ⛔ إضعاف بوابة لتمريرها (eslint/tsconfig/vitest/playwright/ci أو `test.skip`)

# 🤝 المساهمة في EMC Frontend

> **هدف هذا الملف:** أن ينتقل مطوّر جديد **من الصفر إلى أول PR** دون سؤال أحد.
> الوثائق المرجعية: [مركز التوثيق](docs/README.md) · [نظام التصميم V3](docs/04-references/design-system-guide.md) · [الاصطلاحات](docs/04-references/conventions.md) · [الإصدار والنشر](docs/04-references/release-and-deploy.md)

---

## 1) الإعداد (من الصفر)

**المتطلبات:** Node **≥ 24** (`.nvmrc` = 24) · npm · Git.
الواجهة تتحدّث إلى **Laravel REST منفصل** — يمكنك التطوير بلا خادم، لكن الصفحات التي تجلب بيانات ستُظهر حالات فارغة/أخطاء.

```bash
git clone <repo> && cd WEP
nvm use            # أو ثبّت Node 24 يدوياً
npm ci             # ci لا install — يحترم package-lock
cp .env.example .env
npm run dev        # http://localhost:5173
```

**`.env`:** الحد الأدنى هو `VITE_API_URL` (يجب أن يتضمّن `/api`). كل ما تبقّى **اختياري بأمان**: اتركه فارغاً فتبقى الميزة معطّلة (Reverb/الدفع → استطلاع 90 ثانية · `VITE_SENTRY_DSN` → لا مراقبة). **لا تُودِع `.env` أبداً.**

**الفرع المعتمَد `dev`** — لا `main` (الأخير هيكل Vite فارغ).

---

## 2) خريطة سريعة

```
src/
  api/          طبقة النداءات (axios) + مُطبِّعات الاستجابة  ← عقد الخادم يُروَّض هنا
  components/   ui/ = العُدّة القانونية · البقية حسب النطاق
  pages/        الصفحات العامة + اللوحات (~19 دوراً)
  hooks/  lib/  utils/  contexts/  i18n/  types/
  test/         الوحدات (vitest + RTL + axe)
e2e/            Playwright: الرحلات + لوحات الأدوار + الألبوم البصري
docs/           التوثيق (ابدأ من docs/README.md)
scripts/        بوابات وأدوات (check-secrets · check-raw-hex · coverage-truth …)
```

**قاعدة أساسية:** أي شكل بيانات قادم من الخادم يُطبَّع **عند حدود `src/api/`** — لا تمرّر استجابة خاماً إلى صفحة. (ثلاث لوحات كانت تنهار لهذا السبب بالضبط؛ انظر M5.5.)

---

## 3) قبل أول PR — الجولة الكاملة

```bash
npx eslint .              # 0 أخطاء و0 تحذيرات
npm run typecheck:strict  # strict كامل
npm run build             # tsc -b + vite build
npm test                  # الوحدات + axe + عتبات التغطية
npx playwright test       # الرحلات + الأدوار + الألبوم (حاسوب + جوّال 375px)
npm run check:secrets     # لا اعتماديات مسرَّبة ولا console غير محروس
npm run check:brand       # لا hex خام جديد
npm run check:bundle      # الحزمة الأوّلية < 250KB gz
npm audit --audit-level=high
```

كلها تعمل في CI (`.github/workflows/ci.yml`) — لن يمرّ PR يكسر أياً منها.

> **`npm test` لا يفحص الأنواع.** اختبار ناجح لا يعني بناءً ناجحاً — شغّل `typecheck:strict` أيضاً. (كلّفنا هذا خللاً حقيقياً عند إغلاق M7.)

---

## 4) القواعد التي تُرفض عليها المساهمات

### الهوية
اقرأ [دليل نظام التصميم](docs/04-references/design-system-guide.md). الخلاصة: **لا لون خام في مكوّن** · لا مزج بحر↔نار في تدرّج · لا سماوي/برتقالي نصاً على فاتح · لا تعديل على الشعار.

### المؤثّرات (`useEffect`)
`react-hooks/set-state-in-effect` بمستوى **`error`**. الأشكال المقبولة **الثلاثة فقط** موصوفة في [`effect-patterns.md`](docs/04-references/effect-patterns.md): async IIFE داخل جسم الـeffect · callbacks الاشتراك · التعديل أثناء الـrender.
**الحيل المُسكِتة ممنوعة نصاً**: تغليف بـIIFE حول دالة تضبط الحالة متزامناً · `Promise.resolve().then(load)` · إخفاء الدالة خلف `ref`. الإصلاح = إعادة هيكلة حقيقية.

> ومُحدِّثات الحالة **نقيّة**: لا أثر جانبي (تسجيل/توست/نداء شبكة) داخل `setX(prev => …)` — React يعيد استدعاء المُحدِّث، والتطبيق يعمل تحت `StrictMode`. هذا سبّب ازدواج تسجيل مخالفات الاختبار على الخادم (M7).

### الاختبارات
- كل إصلاح خلل يأتي **باختبار انحدار**.
- كل مكوّن جديد يحمل **تأكيد `axe`**.
- عتبات التغطية لكل مجلد في `vitest.config.ts` — **لا تُخفَّض** لتمرير PR.

### ⛔ إضعاف البوابات
**ممنوع منعاً باتاً** تعديل `eslint.config.js` / `tsconfig*` / `vitest.config.ts` / `playwright.config.ts` / `ci.yml`، أو استخدام `test.skip` / `eslint-disable`، **كوسيلة لجعل بوابة تنجح**. إن كانت البوابة تعترض، فالكود هو ما يُصلَح. تقوية بوابة (رفع عتبة، قاعدة جديدة) = **commit مستقل** بمبرَّر مكتوب.

### المحتوى
**لا رقم ولا سعر ولا رابط ولا هاتف على سطح عام قبل تأكيد المؤسس.** غير المؤكَّد يبقى مخفياً — إخفاء لا حذف.

### الحذف
لا يُحذف شيء ظاهر أو مُصدَّر مباشرةً: **إخفاء بعلم → تجربة مرحلة → موافقة**. الإخفاء قابل للتراجع بسطر؛ الحذف لا.

---

## 5) الفروع والـcommits والـPR

```
feature/<name>   ·   fix/<name>          (لا دفع مباشر على dev)
<type>(<scope>): <subject>               feat|fix|docs|style|refactor|perf|test|chore|ci
مثال: feat(auth): إضافة صفحة تسجيل الدخول
```

**قائمة الـPR:**
- [ ] الجولة الكاملة (§3) خضراء
- [ ] اختبار انحدار لكل إصلاح · تأكيد axe لكل مكوّن جديد
- [ ] لا hex خام · لا نصوص داخلية أو بيانات غير مؤكَّدة تسرّبت للعلن
- [ ] سطر في [CHANGELOG](docs/03-changes/CHANGELOG.md) عند تغيير ملموس
- [ ] لا أسرار في الكود (`.env` فقط)

---

## 6) أين تسأل

| السؤال | الوثيقة |
|---|---|
| لماذا هذا اللون/الخط/التوقيع؟ | [design-system-guide](docs/04-references/design-system-guide.md) |
| كيف أكتب effect صحيحاً؟ | [effect-patterns](docs/04-references/effect-patterns.md) |
| كيف أبني وأنشر؟ | [release-and-deploy](docs/04-references/release-and-deploy.md) |
| ماذا تغيّر ولماذا؟ | [CHANGELOG](docs/03-changes/CHANGELOG.md) + تقارير `docs/03-changes/` |
| كيف أتراجع عن كارثة؟ | [ROLLBACK](docs/02-planning/master-plan/ROLLBACK.md) |
| ما الحالة الحالية للعمل؟ | [STATE](docs/02-planning/master-plan/STATE.md) |

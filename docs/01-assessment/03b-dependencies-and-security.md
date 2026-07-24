# تقرير #05 — التبعيات والأمان (Dependencies & Security)

> الغرض: تقييم سلسلة التبعيات، ثغرات `npm audit`، صحّة استخدام أدوات التعقيم، تخزين رموز المصادقة، وإدارة الأسرار والبيئة في واجهة `emc-frontend`.

آخر تحديث: 2026-06-21 · الفرع: dev

---

## 1. الخلاصة التنفيذية

نظافة الإعدادات والأسرار جيدة في تصميمها العام: **لا توجد أسرار أو مفاتيح مكتوبة بشكل صريح (hardcoded) في `src/`** على الإطلاق، وتهيئة Sentry والتحقق من البيئة (`validateEnv`) مشروطان بعناية، وتحميل أدوات التحليلات (GA / Meta Pixel) مُقيَّد خلف موافقة الكوكيز (privacy-by-default — ممارسة جيدة). لكنّ هذه الصورة الإيجابية يقوّضها دَيْن في التبعيات وثغرتان عمليّتان:

- **5 ثغرات في `npm audit`** منها **3 عالية الخطورة** (`vite` / `undici` / `form-data`) و**1 متوسطة لكنها عمليًّا عالية** (`dompurify`، لأنه أداة الدفاع الفعلية ضد XSS في التطبيق) — وكلّها قابلة للإصلاح عبر `npm audit fix`.
- **رموز المصادقة (Bearer tokens) تُخزَّن في `localStorage`**، ما يجعلها قابلة للسرقة عند أي ثغرة XSS — وهذا يتفاقم مع وجود `dompurify` بنسخة تحمل تجاوزات معروفة.
- **حزمة `i` الدخيلة** (`^0.3.7`) دخلت بالخطأ ولا تُستورَد في أي مكان.
- **تسريب رابط WhatsApp حقيقي مع مسافات بادئة** في `.env.example`.
- **لا توجد بوابة CI ولا `npm audit` تلقائي ولا Dependabot**، مع اعتماد نسخ على الحافة النازفة (Vite 8 / React 19.2 / TypeScript 6.0 / ESLint 10).

| المؤشر | القيمة |
|---|---|
| إجمالي التبعيات وقت التشغيل (dependencies) | 21 (شاملة `i` و`sonner` الميتتين) |
| تبعيات التطوير (devDependencies) | 26 |
| ثغرات `npm audit` | 5 (🟠 1 low · 🟡 1 moderate · 🔴 3 high) — كلّها fixable |
| أسرار مكتوبة صراحة في `src/` | 0 ✅ |
| مواضع `dangerouslySetInnerHTML` | 3 — كلّها مُعقَّمة عبر DOMPurify بالملف الافتراضي الآمن ✅ |
| تخزين رمز الجلسة | `localStorage` (`emc_token`) + `sessionStorage` (رمز الانتحال) 🔴 |
| حزم ميتة / دخيلة | `i`, `sonner` (0 استيراد لكلٍّ منهما) |
| بوابة CI / audit تلقائي / Dependabot | غير موجودة 🔴 |

السجل الخام للتدقيق: `docs/01-assessment/tooling-logs/npm-audit.log`.

---

## 2. جرد التبعيات والخيارات اللافتة

التكدّس (stack) حديث ومتماسك، لكنه **على الحافة النازفة** لعدّة مكتبات أساسية، ما يفسّر جزئيًا ظهور ثغرات الإصدارات الأحدث.

### 2.1 تبعيات وقت التشغيل (`dependencies`)

| الحزمة | النسخة | الدور | ملاحظة |
|---|---|---|---|
| `react` / `react-dom` | ^19.2.5 | الأساس | حافة نازفة (React 19) |
| `react-router-dom` | ^7.14.2 | التوجيه | جدول توجيه واحد (~350 مسار) |
| `axios` | ^1.15.2 | طبقة HTTP | عميل مركزي واحد + interceptors |
| `@sentry/react` | ^10.57.0 | تتبّع الأخطاء | تهيئة مشروطة بـ DSN ✅ |
| `framer-motion` | ^12.38.0 | الحركة | مُستخدَمة في ~311 ملفًّا |
| `recharts` | ^3.8.1 | الرسوم البيانية | في لوحات التحكم (lazy) |
| `dompurify` | ^3.4.5 | **تعقيم HTML** | ⚠️ نسخة بها تحذير أمني نشط — انظر §4 و§5 |
| `react-select` | ^5.10.2 | قوائم منسدلة | غير مُجزّأة في chunk مستقل |
| `react-helmet-async` | ^3.0.0 | وسوم SEO | عبر `PublicSeo` |
| `libphonenumber-js` | ^1.13.6 | تحقّق الهواتف | |
| `i18n-iso-countries` | ^7.14.0 | أسماء الدول | ليست مكتبة i18n عامة |
| `pdf-lib` | ^1.17.1 | توليد PDF | dynamic import — خارج الحزمة الأولية ✅ |
| `browser-image-compression` | ^2.0.2 | ضغط الصور | استخدام عالي الجودة |
| `clsx` + `tailwind-merge` | ^2.1.1 / ^3.5.0 | تركيب الأصناف | عبر `cn()` |
| `lucide-react` | ^1.11.0 | الأيقونات | |
| `react-hot-toast` | ^2.6.0 | الإشعارات | **المكتبة المُستخدَمة فعليًّا** (ملفّان) |
| `sonner` | ^2.0.7 | الإشعارات | 🟡 **ميتة** — 0 استيراد (تكرار) |
| `i` | ^0.3.7 | — | 🟡 **دخيلة** — 0 استيراد (انظر §3) |

### 2.2 تبعيات التطوير (مختارات)

البنية التحتية للاختبار والبناء كاملة وحديثة: `vite` ^8.0.10، `vitest` ^4.1.7، `@testing-library/*`، `jsdom`، `eslint` ^10.2.1 (flat config) + `typescript-eslint` ^8، إضافة إلى `sharp` + `svgo` + `vite-plugin-image-optimizer` لتحسين الصور، و`typescript` ~6.0.2.

> ملاحظة دَيْن من تقرير آخر تخصّ هذا التقرير: `package.json` يعرّف `test:coverage` لكن **لا يوجد مزوّد تغطية** (`@vitest/coverage-v8` غير مثبّت)، فالأمر مكسور افتراضيًّا.

---

## 3. الحزمة الدخيلة `i` 🟡

```jsonc
// package.json:23
"i": "^0.3.7",
```

`i` هي حزمة "custom inflections for nodejs" مخصّصة لبيئة Node فقط، ولا تُستورَد في أي ملف داخل `src/` (0 نتيجة). هي على الأرجح بقايا أمر `npm i` مقطوع أو خطأ مطبعي، وتُضيف تبعية غير مُستخدَمة وغير مُدقّقة إلى شجرة تبعيات حزمة تعمل في المتصفّح.

**الإصلاح:**
```bash
npm uninstall i sonner
```
(يُزال معها `sonner` الميتة لتوحيد مكتبة إشعارات واحدة هي `react-hot-toast`.)

---

## 4. ثغرات `npm audit` 🔴

نتيجة `npm install`: 224 حزمة مُضافة، 470 مُدقّقة. نتيجة `npm audit`: **5 ثغرات** (1 low · 1 moderate · 3 high)، **جميعها قابلة للإصلاح عبر `npm audit fix`**. التفاصيل الخام في `docs/01-assessment/tooling-logs/npm-audit.log`.

| الحزمة | النطاق المتأثّر | الخطورة | نوع التبعية | وصف موجز | الإصلاح |
|---|---|---|---|---|---|
| `vite` | 8.0.0 – 8.0.15 | 🔴 HIGH | مباشرة (dev) | كشف هاش NTLMv2 عبر مسار UNC على Windows + تجاوز `server.fs.deny` على Windows — **والفريق يطوّر على Windows** فالتعرّض في خادم التطوير حقيقي | `npm audit fix` |
| `undici` | 7.0.0 – 7.27.2 | 🔴 HIGH | عابرة (transitive) | تجاوز التحقق من شهادة TLS، كشف معلومات الكاش، حقن ترويسة `Set-Cookie`، DoS عبر WebSocket، إعادة استخدام مجمّع البروكسي | `npm audit fix` |
| `form-data` | 4.0.0 – 4.0.5 | 🔴 HIGH | عابرة (عبر `axios`) | حقن CRLF عبر أسماء حقول multipart غير مُهرَّبة | `npm audit fix` |
| `dompurify` | ≤ 3.4.10 | 🟡 MODERATE *(عمليًّا 🔴)* | مباشرة | 8 تحذيرات: تجاوزات XSS في وضع IN_PLACE، تلويث `ALLOWED_ATTR`، تسميم Trusted Types، تجاوز القوالب — **عالي الأهمية العملية لأن `dompurify` هو خط دفاع XSS الفعلي في التطبيق** | `npm audit fix` (يرفع إلى ≥ 3.4.11) |
| `@babel/core` | ≤ 7.29.0 | 🟢 LOW | عابرة | قراءة ملف عشوائي | `npm audit fix` |

> **تشديد على `dompurify`:** رغم تصنيف الأداة له «متوسطًا»، فإنّ أثره العملي **عالٍ** لأنه — على خلاف التبعيّات العابرة الثلاث — هو آلية الحماية الفعلية ضد XSS؛ يُعقّم HTML قادمًا من الخادم قبل حقنه (انظر §5). مُعقِّم بتجاوز معروف = تعرّض XSS حقيقي على محتوى يراه المستخدم.

**الإجراء الموصى به:**
```bash
npm audit fix          # يُصلح الخمس جميعًا
npm run build && npm test   # البناء والاختبارات يمرّان أصلًا → المخاطرة منخفضة
```

---

## 5. صحّة استخدام DOMPurify وتدقيق `dangerouslySetInnerHTML` ✅

الاستخدام نفسه **سليم** — المشكلة في رقم النسخة فقط، لا في طريقة الاستدعاء.

توجد **3 مواضع فقط** لـ `dangerouslySetInnerHTML`، وكلّها مُعقَّمة عبر `DOMPurify.sanitize()` **بالملف الافتراضي الآمن** (دون أي `ALLOWED_TAGS` / `ADD_ATTR` / `RETURN_DOM` خطِرة):

| الموقع | المحتوى المُعقَّم |
|---|---|
| `src/pages/LearningPathDetail.tsx:307` | وصف المسار التعليمي (HTML من الخادم) |
| `src/pages/platform/KnowledgeArticlePublicPage.tsx:68` | مقالات قاعدة المعرفة |
| `src/components/platform/LessonPlayer.tsx:68` | `content_html` للدرس |

**التقييم:** لا إساءة استخدام لـ IN_PLACE ولا `RETURN_DOM` تُضخِّم التحذير. كل ما يلزم هو رفع النسخة عبر `npm audit fix`، مع إبقاء نمط الاستدعاء الافتراضي كما هو. 🟢

---

## 6. تخزين رموز المصادقة (Token Storage) 🔴

```ts
// src/api/axios.ts:6,36-39 — القراءة عند كل طلب
const TOKEN_KEY = 'emc_token'
...
const token = localStorage.getItem(TOKEN_KEY)
if (token) config.headers.Authorization = `Bearer ${token}`
```

| العنصر | مكان التخزين | الخطر |
|---|---|---|
| رمز الجلسة `emc_token` | `localStorage` | قابل للقراءة من أي JavaScript ⇒ سرقة عبر XSS |
| كائن المستخدم `emc_user` | `localStorage` | يشمل `role` ⇒ يمكن العبث به محليًّا (راجع تقرير الصلاحيات) |
| رمز المدير الأصلي أثناء الانتحال `emc_sa_original_token` | `sessionStorage` | **أسوأ نطاق انفجار**: أعلى صلاحية تبقى مقروءة لـ JS طوال جلسة المعاينة |

**لماذا هذا حرِج هنا تحديدًا:** التطبيق كبير (570 ملف `.tsx`) ويحقن HTML مُعقَّمًا في 3 مواضع عبر `dompurify` **بنسخة تحمل تجاوزات معروفة** (§4/§5). فأي XSS — وتحديدًا أثناء الانتحال — يمكنه تسريب رمز Bearer ورمز المدير الأصلي معًا. تخزين الرموز في `localStorage` هو أشيع ناقل لسرقة الرموز.

**يتفاقم بـ:** `src/components/lms/SubmissionReviewPanel.tsx:86-90` يقرأ الرمز يدويًّا من `localStorage` لطلب `fetch` خام يتخطّى الـ interceptors (ويستخدم `VITE_API_URL` فقط دون الـ fallback إلى `VITE_API_BASE_URL`):

```ts
// SubmissionReviewPanel.tsx:86-90
const token = localStorage.getItem('emc_token')
const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const url = `${base}/instructor/submissions/${submissionId}/file...`
const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
```

**التوصيات (مرتّبة):**
1. تفضيل كوكيز `httpOnly, Secure, SameSite` يُصدرها Laravel API لرمز الجلسة، بحيث لا تستطيع JS قراءته.
2. إن تعذّر قريبًا: إبقاء رمز الوصول في الذاكرة (state/closure) مع TTL قصير + تدفّق refresh، واعتبار قيمة `localStorage` ملاذًا أخيرًا.
3. **إدارة الانتحال من جانب الخادم** بإصدار رمز انتحال مُقيَّد ونقطة `stop` تُعيد إصدار جلسة المدير، حتى لا يُخزَّن رمز المدير الأصلي على العميل أصلًا.
4. توجيه تنزيل ملف `SubmissionReviewPanel` عبر `apiClient` (`responseType:'blob'`) بدل `fetch` الخام.
5. رفع `dompurify` (§4) لتقليل سطح XSS الذي يجعل سرقة الرمز ممكنة.

---

## 7. إدارة الأسرار والبيئة وتسريب `.env.example`

### 7.1 الإيجابيات ✅
- **لا أسرار مكتوبة صراحة في `src/`**: البحث عن `key/secret/password/Bearer` يعيد فقط نصوص واجهة وتحذيرات تخصّ جانب الخادم (`SecretWarningPanel`).
- `.gitignore` يتجاهل `.env` و`.env.production` و`*.local`؛ المُتعقَّب فقط هو `.env.example` (لا أسرار حقيقية في السجل).
- `src/utils/validateEnv.ts`: تحقّق عند الإقلاع — يُحذّر في dev، ويُظهر صفحة خطأ عربية ويرمي استثناءً في الإنتاج عند غياب `VITE_API_URL`.

### 7.2 تسريب رابط WhatsApp + خطأ المسافات 🟡

```bash
# .env.example:32
VITE_WHATSAPP_COMMUNITY_URL=  https://chat.whatsapp.com/JHpRw1TryB89mUpqSReKh1
```

مشكلتان في سطر واحد:
1. **رابط دعوة مجتمع حقيقي وفعّال** مُودَع داخل ملف المثال — ملفّ المثال يجب ألّا يحمل دعوة حيّة.
2. **مسافتان بادئتان** قبل القيمة ستُحلَّلان كجزء من القيمة (خطأ whitespace) ويُفسدانها عند النسخ الحرفي.

كما يوجد أثر `name` شاذّ في فاصل التعليق بالسطر 29 (`────name────`).

**الإصلاح:**
```bash
# .env.example
VITE_WHATSAPP_COMMUNITY_URL=
```
(قيمة فارغة دون مسافات بادئة، وتصحيح فاصل التعليق.)

---

## 8. Sentry وتتبّع الأخطاء ✅

`src/utils/sentry.ts`: تُهيَّأ Sentry **فقط** عند ضبط `VITE_SENTRY_DSN`، وعبر `dynamic import` بحيث لا يُحمَّل chunk الـ SDK إن لم يُضبط — مكسب للحجم وللخصوصية. `tracesSampleRate: 0.1` وأخذ عيّنات الإعادة (replay) مُهيّأ. كذلك `src/components/ErrorBoundary.tsx` يُبلّغ Sentry فقط عند وجود DSN، ويُظهر تفاصيل الخطأ في DEV فقط.

**فجوة مُلاحَظة (🟡):** طبقة الـ API تبتلع الأخطاء بصمت في 102 من 105 كتلة `catch` (تُعيد `[]`/`null`)، **دون** استدعاء `Sentry.captureException`، فأخطاء الخادم الحقيقية (500، تغيّر المخطّط) قد تُنتج واجهات فارغة دون أي إشارة تشخيصية. يُستحسن إضافة `Sentry.captureException(err)` قبل إرجاع القيمة الاحتياطية.

---

## 9. تقييد التحليلات بموافقة الكوكيز ✅

تحميل GA (`VITE_GA_MEASUREMENT_ID`) وMeta Pixel (`VITE_META_PIXEL_ID`) **لا يحدث إلا بعد موافقة الكوكيز** (`CookieBanner` + `CookiePreferencesModal`، عبر `src/lib/cookieConsent.ts`). هذه ممارسة **privacy-by-default** سليمة ومتوافقة مع GDPR، وتُعزَّز بأنّ `CookieConsentContext` يُحفِّظ القيمة بـ `useMemo` ويغلّف الإجراءات بـ `useCallback` (النمط الصحيح). 🟢

---

## 10. نظافة سلسلة التوريد 🔴

| العنصر | الحالة | الخطورة |
|---|---|---|
| بوابة CI تُشغّل lint/tsc/test/build على الـ PR | غير موجودة | 🔴 |
| `npm audit` تلقائي في CI | غير موجود | 🔴 |
| Dependabot / Renovate لتحديث التبعيات | غير موجود | 🟠 |
| اعتماد نسخ على الحافة النازفة | Vite 8 · React 19.2 · TS 6.0 · ESLint 10 | 🟡 |
| حزم ميتة/دخيلة في الحزمة | `i`, `sonner` (0 استيراد) | 🟡 |
| ملفات نفايات مُتعقَّبة في git | `dir` (0 بايت)، `C:tempteam_data.txt` (0 بايت) | 🟢 |
| `AGENTS.md` يصف إطار "WAT" غير ذي صلة (يُلمِّح لوضع أسرار في `.env`) | مُضلِّل | 🟡 |

**الأهمّ:** غياب أي CI يعني أنّ الاختبارات الـ54 و`eslint` (الذي **يفشل حاليًّا** بأخطاء حقيقية) و`tsc` والبناء لا تُشغَّل إلا يدويًّا على جهاز المطوّر. لا شيء يمنع دخول commit يكسر البناء أو يفشل الـ lint. هذا هو الإصلاح الأعلى رافعة.

**نموذج بوابة مقترحة:**
```yaml
# .github/workflows/ci.yml
- run: npm ci
- run: npm audit --audit-level=high   # يمنع تراجع الثغرات
- run: npm run lint
- run: npx tsc -b
- run: npm test
- run: npm run build
```

---

## 11. التوصيات (مرتّبة بالأولوية)

- [ ] 🔴 تشغيل `npm audit fix` ثم `npm run build && npm test` (يُصلح الـ5 ثغرات؛ يرفع `dompurify` إلى ≥ 3.4.11). سجل: `docs/01-assessment/tooling-logs/npm-audit.log`.
- [ ] 🔴 إضافة بوابة CI (GitHub Actions) تُشغّل `npm ci && npm audit --audit-level=high && npm run lint && tsc -b && npm test && npm run build` على فروع `dev`/`main`.
- [ ] 🔴 معالجة تخزين رمز الجلسة: تفضيل كوكيز `httpOnly`، وإدارة الانتحال من جانب الخادم بحيث لا يبقى رمز المدير الأصلي على العميل.
- [ ] 🟠 توجيه تنزيل الملفّ في `SubmissionReviewPanel.tsx` عبر `apiClient` بدل `fetch` الخام (وتصحيح fallback متغيّر البيئة).
- [ ] 🟠 تفعيل Dependabot/Renovate لمتابعة تحديثات الأمان آليًّا على نسخ الحافة النازفة.
- [ ] 🟡 إزالة الحزم الميتة/الدخيلة: `npm uninstall i sonner` (توحيد `react-hot-toast`).
- [ ] 🟡 إصلاح `.env.example`: تفريغ `VITE_WHATSAPP_COMMUNITY_URL` وإزالة المسافات البادئة وتصحيح فاصل التعليق بالسطر 29.
- [ ] 🟡 إضافة `Sentry.captureException` في كتل `catch` المبتلعة بطبقة الـ API قبل إرجاع القيمة الاحتياطية.
- [ ] 🟡 إضافة `@vitest/coverage-v8` لإصلاح `test:coverage` المكسور افتراضيًّا.
- [ ] 🟢 حذف ملفّات النفايات المُتعقَّبة (`dir`, `C:tempteam_data.txt`) و`AGENTS.md` المُضلِّل (أو إعادة كتابته لهذه الواجهة).

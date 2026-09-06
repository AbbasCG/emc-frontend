# تقرير #04 — طبقة الـ API والبيانات وإدارة الحالة

تقييم احترافي لطبقة `axios`، ووحدات `*Api.ts`، وتطبيع الاستجابات، واستراتيجية إدارة الحالة (Context + Hooks) في واجهة `emc-frontend`.

آخر تحديث: 2026-06-21 · الفرع: dev

---

## 1. الخلاصة التنفيذية

طبقة الـ API في هذا التطبيق **ناضجة ومبنية يدويًا بعناية**، وليست هيكلًا أوليًا (stub). تتألف من **72 ملف `*Api.ts`** بحجم تقريبي **11,334 سطرًا** و**365 دالة مُصدَّرة**، تعمل جميعها فوق نسخة `axios` مركزية واحدة (`src/api/axios.ts`). نقاط القوة الحقيقية ثلاث:

1. **انضباط نوعي ممتاز** — صفر استخدام لـ `any` عبر كامل `src/api` + `src/services` (تأكيد بالـ grep)، مع اعتماد منهجي على `unknown` ثم التضييق (narrowing). البناء `tsc -b` يجتاز بنظافة.
2. **معترضات (interceptors) مدروسة ومركزية** — حقن الـ Bearer، ومعالجة 401 مع استعادة جلسة الانتحال (impersonation)، ومعالجة 403 للحساب المُعلَّق، وتطبيع رسائل الخطأ إلى العربية في مكان واحد.
3. **تطبيع دفاعي للبيانات** يتحمّل عقد Laravel المتغيّر (أسماء مفاتيح متعددة، أغلفة `{data}` متداخلة).

في المقابل، فإن **الديون تشغيلية لا نوعية**، وهي جوهرية: **لا يوجد timeout على الإطلاق**، **لا يوجد إلغاء طلبات (AbortController) في أي مكان**، **لا توجد طبقة تخزين مؤقت (cache) ولا إزالة تكرار (dedup)**. أما استراتيجية الحالة فهي **Context + `useState` لكل مكوّن** بلا أي مكتبة حالة عامة (صفر `redux/zustand/react-query`، وصفر `useReducer` في 752 ملفًا) — وهذا اختيار خفيف ومعقول من حيث المبدأ، لكنه **غير مدعوم بطبقة تجريد كافية**: نمط جلب البيانات نفسه مكرّر يدويًا عبر **~95 ملفًا** بدل hook مشترك واحد.

| المحور | التقييم | الملاحظة الجوهرية |
|---|---|---|
| العميل المركزي `axios` + المعترضات | 🟢 جيد | تصميم نظيف؛ ينقصه `timeout` فقط |
| الانضباط النوعي (`any` vs typed) | 🟢 جيد | صفر `any` عبر 72 ملفًا |
| غياب `timeout` | 🔴 حرِج | الطلبات قد تتعلّق إلى الأبد |
| غياب `AbortController` / الإلغاء | 🔴 حرِج | سباقات حالة + `setState` بعد إلغاء التركيب |
| غياب طبقة cache / dedup | 🟠 مهم | إعادة جلب كاملة عند كل mount |
| تكرار دوال فك التغليف (unwrap) | 🟡 ثانوي | 3 أجيال متعايشة + 7 نسخ محلية |
| أخطاء ESLint في ملفات الـ API | 🟡 ثانوي | 4 أخطاء تُفشل `npm run lint` |
| استراتيجية الحالة (Context-only) | 🟠 مهم | تتوسّع، لكن بلا تجريد جلب موحّد |
| `AuthContext` غير محفوظ (unmemoized) | 🟠 مهم | يُعيد تصيير 41 مستهلكًا عند كل تغيّر |

---

## 2. العميل المركزي `axios` — `src/api/axios.ts`

العميل مُهيّأ مرة واحدة مركزيًا، وهذا في حدّ ذاته نقطة قوة معمارية (بدل نداءات `fetch` متناثرة).

### 2.1 ربط `baseURL` والبيئة

```ts
// src/api/axios.ts:22
const apiBaseUrl = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL
if (!apiBaseUrl && !import.meta.env.DEV) {
  throw new Error('[EMC] VITE_API_URL is not set. Add it to your .env file.')
}
```

- 🟢 **تراجع مزدوج للبيئة**: يقرأ `VITE_API_URL` ثم يتراجع إلى `VITE_API_BASE_URL` — مرونة جيدة بين بيئات النشر.
- 🟡 **حارس البيئة في DEV قد يُخفي تهيئة خاطئة** (`axios.ts:22-25`): إذا لم يُضبط أيّ من المتغيّرين، فإن `baseURL` يصبح `undefined` ويُرمى الخطأ **في الإنتاج فقط** (`!import.meta.env.DEV`). في DEV تذهب الطلبات بصمت إلى أصل خادم التطوير وتفشل بطرق مربكة (404 على نفس الأصل) بدل الفشل السريع.
  - **الإصلاح**: في DEV سجّل تحذيرًا صريحًا واضحًا، أو تراجَع إلى افتراضي موثّق مثل `http://127.0.0.1:8000/api`.

### 2.2 معترض الطلب — حقن الـ Bearer

```ts
// src/api/axios.ts:35-41
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)   // 'emc_token'
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

- 🟢 حقن مركزي وحيد للرمز — لا تكرار في مواقع النداء.
- 🔴 **مصدر الرمز هو `localStorage`** (راجع التقرير الأمني #07). أي XSS في 570 ملف `.tsx` يستطيع سرقة الرمز. هذا الجزء يُسجَّل هنا بوصفه مصدر الرمز، لكن العلاج (httpOnly cookies) يخصّ التقرير الأمني.

### 2.3 معترض الاستجابة — معالجة الأخطاء

المعترض (`axios.ts:44-138`) مدروس ويغطّي حالات حقيقية:

| الحالة | السلوك | التقييم |
|---|---|---|
| 401 (غير محاولة مصادقة) | استعادة رمز الانتحال الأصلي من `sessionStorage` إن وُجد، وإلا تنظيف الجلسة + تحويل صلب إلى `/login` مع حفظ `next` | 🟢 يميّز الانتحال عن انتهاء الجلسة بشكل صحيح |
| 401 على `/auth/me` (`isSilentAuthProbe`) | لا تحويل صلب — يمنع حلقات إعادة التوجيه | 🟢 |
| 403 «Account is suspended.» | تنظيف الجلسة + تحويل إلى `/login?reason=suspended` | 🟢 |
| 403/404 على `GET /finance*` و`/notifications*` | كتم الـ toast (probes متوقَّعة) | 🟢 تقليل الضجيج |
| `>= 500` / `4xx` | `toast.error` / `toast.warning` بالعربية عبر `getApiErrorMessage` | 🟢 رسائل موحّدة محلّية |
| راية `skipErrorToast` لكل طلب | تعطيل الـ toast العام محليًا للنماذج | 🟢 تصميم نظيف (مُوسَّع نوعيًا عبر `src/types/axios-augment.d.ts`) |

- 🟡 **تحويل `window.location.href` الصلب** ضمن مسار استعادة 401 (`axios.ts:83,94`) قد يتسابق مع حالة React الجارية. مقبول، لكن يُفضَّل لاحقًا تمرير الانتقال عبر الموجّه (router).

### 2.4 الثغرة الحرجة: غياب `timeout`

```ts
// src/api/axios.ts:27-32 — لا يوجد timeout
const apiClient = axios.create({ baseURL: apiBaseUrl, headers: { Accept: 'application/json' } })
```

🔴 **حرِج** — `grep "timeout:"` في `src/api,src/services` = **0 نتيجة**. لا timeout عام ولا لكل طلب. على خادم بطيء أو شبكة متعثّرة، لا تُحسم الطلبات أبدًا (بما فيها تفرّع لوحة الطالب ذي الـ 11 نداءً)، فتبقى المؤشّرات الدوّارة عالقة و`loading` على `true` للأبد دون أي toast خطأ (لأن مسار «لا استجابة» الذي يصل عادةً إلى `axios.ts:132` لا يُفعَّل).

**الإصلاح**:
```ts
const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20_000,                 // افتراضي معقول
  headers: { Accept: 'application/json' },
})
// مع السماح بتجاوز لكل نداء للنقاط البطيئة المعروفة (رفع الملفات/التقارير)
```

---

## 3. وحدات `*Api.ts` — التنظيم والتكرار والتنميط

### 3.1 الحجم والبنية

| المقياس | القيمة |
|---|---|
| عدد ملفات `src/api/*.ts` | 72 |
| إجمالي الأسطر | ~11,334 |
| الدوال المُصدَّرة | 365 |
| استخدام `any` في `api` + `services` | **0** |
| استخدام `AbortController`/`signal` | **0** |
| مكتبات cache (`react-query`/`swr`) | **0** |
| تهيئة `timeout` | **0** |
| كتل `catch` في `api`+`services` | 105 (منها 102 تبتلع الخطأ وتُرجع `[]`/`null`) |

أكبر الملفات (God files):

| الملف | الأسطر |
|---|---|
| `src/api/placementApi.ts` | 1575 |
| `src/api/studentApi.ts` | 1291 |
| `src/api/courseLearnApi.ts` | 845 |
| `src/api/adminUsersApi.ts` | 649 |
| `src/api/instructorApi.ts` | 636 |

### 3.2 الانضباط النوعي — 🟢 جيد

- صفر `any` عبر الـ 72 ملفًا و`src/services`. الأنماط تُعرَّف في وحدات مخصّصة (`src/types/{courseLearn,lms,operations,platform,intelligence,hr,ai,index}.ts`)، والدوال تُرجع أنواعًا مجالية محدّدة لا `unknown`.
- وحدة تطبيع الأخطاء `src/api/apiErrors.ts` نموذجية: `getApiErrorMessage` تحلّل أجسام Laravel (`{message}`/`{errors}`) إلى عربية، و`getLaravelFieldErrors` تُسطّح `{field:[msg]}` (بما فيها المفاتيح المنقّطة مثل `learning_outcomes.0`)، و`translateLaravelFieldMessage` تترجم رسائل التحقّق الإنجليزية الشائعة.
- توسيع الوحدة `src/types/axios-augment.d.ts` يُضيف `config.skipErrorToast` و`error.apiMessage` بشكل نوعي نظيف — طريقة سليمة لتمرير الرايات العرضية.

### 3.3 تكرار دوال فك التغليف (unwrap) — 🟡 ثانوي

تتعايش **ثلاثة أجيال** من منطق فكّ غلاف `{data}` نفسه، إضافة إلى **~7 نسخ محلية** لكل ملف:

| الموقع | الدالة |
|---|---|
| `src/api/unwrap.ts:2` | `unwrapData<T>` (الغلاف القياسي) |
| `src/api/lmsApi.ts:4-15` | `asList` / `unwrapLms` (قوائم + تداخل مزدوج) |
| `src/api/coursesApi.public.ts:13-49` | `coerceToObjectArray` / `extractCoursesList` (يتحمّل data/courses/items/results/records/rows + المُرقِّمات) |
| نسخ محلية | `adminUsersApi.ts:223`، `adminCoursesApi.ts:143`، `membersApi.ts:143`، `profileApi.ts:43` |

كما يوجد **ملفّا دورات متنافسان**: `src/api/coursesApi.public.ts` (جلب خام + تطبيع) مقابل `src/services/coursesApi.ts` (تخطيط + mock + بحث) — اسمان متشابهان في مجلّدين، ما يجعل اختيار الاستيراد ملتبسًا. الخطر حقيقي: نقاط نهاية مختلفة تتحمّل أشكال أغلفة مختلفة بالصدفة لا بالتصميم.

**الإصلاح**: توحيد على زوج قانوني واحد `unwrapData`/`asList` وحذف النسخ المحلية؛ واختيار موقع/اسم وحيد لجلب الدورات (دمج `services/coursesApi` في `api/` أو العكس).

### 3.4 أخطاء ESLint مؤكَّدة في ملفات الـ API — 🟡 ثانوي

`npm run lint` يفشل (exit 1). الأخطاء المؤكَّدة في طبقة الـ API:

| الملف:السطر | القاعدة | الوصف |
|---|---|---|
| `courseLearnApi.ts:373` | `prefer-const` | `sub` يجب أن تكون `const` |
| `courseLearnApi.ts:633` | `no-unused-vars` | `_err` غير مستخدم في catch |
| `learningPathsApi.ts:446` | `no-unused-vars` | `fetchInstructorLearningPaths(_userId?)` تأخذ معاملًا لا تستخدمه — قد يفترض المستدعون أنه يُحدّد نطاق الاستعلام، وهو لا يفعل |
| `hrDashboardApi.ts:182` | `no-useless-assignment` | `vols = []` ثم تُستبدل فورًا داخل try (إسناد ميّت) |

**الإصلاح**: `eslint --fix` لـ prefer-const؛ حذف `_userId` غير المستخدَم (أو استخدامه فعليًا لتحديد النطاق) والإسناد الميّت `vols`؛ ومواءمة كتلة catch مع عُرف `catch {}` في المشروع.

### 3.5 ابتلاع الأخطاء الصامت + بناء baseURL مكرّر — 🟡 ثانوي

- **102 من 105 كتل catch** تبتلع الخطأ وتُرجع `[]`/`null` دون تسجيل ودون toast. هذا ممتاز للتدهور الرشيق (graceful degradation)، لكنه يعني أن أخطاء الخادم الحقيقية (500، تغيّر المخطّط) قد تُصيّر واجهات فارغة بصمت دون أي إشارة تشخيصية — رغم أن **Sentry مثبّت لكنه لا يُستدعى** من كتل catch هذه.
  - **الإصلاح**: في كتل الابتلاع، استدعِ `Sentry.captureException(err)` (أو `console.warn` في DEV) قبل إرجاع البديل الفارغ.
- **بناء baseURL يدوي خارج العميل** في `certificatesApi.ts:39`، `SubmissionReviewPanel.tsx:87`، `services/teamApi.ts:128`، `utils/mediaUrl.ts:11`. الأخطر: `SubmissionReviewPanel.tsx:87` يقرأ `VITE_API_URL` **فقط** (دون تراجع `VITE_API_BASE_URL`)، فينكسر في البيئات التي تضبط المتغيّر الثاني وحده — وهذه المواقع تتجاوز المعترضات (رأس المصادقة، تطبيع الأخطاء).
  - **الإصلاح**: دالة مركزية `getApiBaseUrl()` وتوجيه نداءات الـ fetch الخام عبرها (أو عبر `apiClient` حيث تلزم المصادقة).

---

## 4. جلب البيانات: التطبيع والإلغاء والتخزين المؤقت

### 4.1 نمط الجلب الفعلي

جلب البيانات هنا = **نداءات `apiClient` أمرية (imperative)** مُستدعاة من hooks/مكوّنات عبر `Promise.allSettled`، لا مكتبة استعلام. وحدتا الجلب الرئيسيتان (`src/hooks/useStudentDashboardData.ts`، `useStudentLearningLists.ts`) تتفرّعان إلى 11 نقطة نهاية عبر `Promise.allSettled` مع بدائل لكل فهرس؛ و**6 مكوّنات فقط** تستدعي `apiClient` مباشرة (الباقي يمرّ عبر طبقة الـ api).

### 4.2 الثغرة الحرجة: غياب الإلغاء والسباقات

🔴 **حرِج** — `grep "AbortController|signal:"` في `src/api,src/services,src/hooks` = **0 نتيجة**.

- لا يمرّر أيّ من ~150 موقع جلب داخل `useEffect` أيّ `AbortSignal`، ودوال الـ api لا تقبله.
- مُحمّل الطالب (`useStudentDashboardData.ts:223-291`) يُشغّل `Promise.allSettled([...11 calls])` ثم ينفّذ ~12 `setState` في `load()` (الأسطر 250-283) **دون حارس `cancelled`/`ignore` ودون إلغاء عند التنظيف**. إذا تغيّر `userId` أو أُلغي تركيب المزوّد أثناء الطيران، تظل الاستجابات القديمة تستدعي `setState` — سباق بيانات قديمة كلاسيكي + تحذيرات React عن تحديث مكوّن غير مُركَّب. وينطبق الأمر نفسه على الجلب داخل المكوّنات عبر الصفحات.

**الإصلاح** (مرحلي قصير الأمد):
```ts
useEffect(() => {
  let ignore = false
  load().then((res) => { if (!ignore) setState(res) })
  return () => { ignore = true }
}, [deps])
```
**الإصلاح الجذري**: تمرير `signal?: AbortSignal` اختياري عبر دوال الـ api (axios يدعمه أصلًا) والإلغاء في تنظيف الـ effect — أو تبنّي مكتبة استعلام (انظر §5).

### 4.3 الثغرة المهمة: غياب التخزين المؤقت / إزالة التكرار

🟠 **مهم** — `grep "react-query|@tanstack|swr"` في `src/` = **0 نتيجة**.

كل الجلب أمري عبر `useEffect/useState` يدويًا. لا dedup، لا stale-while-revalidate، لا cache مشترك. النتيجة: نقاط النهاية نفسها (الكتالوج/الملف/الإشعارات) تُعاد جلبها مرارًا عبر المسارات، وكل hook يعيد تنفيذ منطق loading/error/refresh. **هذا هو السبب الجذري** الذي يفرض أيضًا معالجة timeout والإلغاء اليدوية أعلاه. كما أن تفرّع `studentApi` يُعاد تشغيله بالكامل عند كل mount للمزوّد وعند حدث مخصّص `STUDENT_SCOPE_REFRESH_EVENT`.

### 4.4 التطبيع الدفاعي — 🟢 جيد

- نمط تجميع صامد: `src/api/hrDashboardApi.ts` ومُحمّل الطالب يستخدمان probes صامتة بـ `skipErrorToast` + try/catch لكل مصدر للتدهور الرشيق (مثلًا 403 → أعلام فجوات في `HrDashboardLinkedFlags`) بدل إفشال الصفحة كاملة.
- منفذ هروب للبيانات الوهمية: `VITE_USE_MOCK_CATALOG` في `src/services/coursesApi.ts:9` يُرجع fixtures، مع افتراض الـ API الحيّ فقط.

---

## 5. استراتيجية إدارة الحالة

### 5.1 الوضع الحالي

الاستراتيجية = **React Context + `useState` لكل مكوّن**، بلا أي مكتبة عامة:

| المقياس | القيمة |
|---|---|
| ملفات `src/contexts/` | 2 (`AuthContext`، `CookieConsentContext`) + سياق ثالث داخل hook الطالب |
| ملفات `src/hooks/` | **2 فقط** (`useStudentDashboardData.ts` 452 سطرًا، `useStudentLearningLists.ts` 18 سطرًا) |
| ملفات `src/utils/` | 42 (مُحكمة التنظيم) |
| `useEffect` | 261 موضعًا عبر 193 ملفًا |
| نمط `setLoading(true)` للجلب المضمّن | **96 ملفًا** |
| مستهلكو `useAuth()` | 41 ملفًا |
| `useReducer` | **0** |
| مكتبات حالة عامة (redux/zustand/jotai/react-query) | **0** |

**التقييم**: تجنّب Redux/Zustand اختيار معقول لهذا الحجم — فالـ Context يغطّي الشواغل العامة القليلة الفعلية (المصادقة، الموافقة، لوحة الطالب). لكن المشكلة **ليست في غياب مكتبة حالة العميل (client state)، بل في غياب طبقة لحالة الخادم (server state)**: معظم «الحالة» في هذا التطبيق هي بيانات خادم مخبّأة في `useState`، وهذا تحديدًا ما تحلّه مكتبة استعلام.

### 5.2 الثغرة المهمة: تكرار نمط الجلب عبر ~95 ملفًا

🟠 **مهم** — `src/hooks/` يحوي ملفين فقط، بينما النمط نفسه (`useState rows/loading/loadError` + `load()` غير متزامنة بـ `setLoading(true)`/try-catch/`finally setLoading(false)` + `useEffect(()=>{load()},[])`) منسوخ يدويًا في **~95 ملف صفحة/مكوّن** (96 ملفًا يطابقون `setLoading(true)`). مثال حرفي: `CouponsAdminPage.tsx:19-33`. هذا **أكبر مسؤولية صيانة منفردة** في هذه الشريحة: لا سياسة retry/abort/error موحّدة، رسائل خطأ متباينة، ولا مكان واحد لإضافة الإلغاء.

والمفارقة أن الفريق **يجيد كتابة hooks ممتازة**: `src/pages/operations/hooks/useTasksWorkspace.ts` يطبّق تحديثات تفاؤلية مع تراجع عند الخطأ وقوائم `useCallback` صحيحة — هذا النموذج الذي يجب تعميمه.

**الإصلاح**: استخراج hook عام `useResource<T>(fetcher, deps)` (يحمل `data, loading, error, reload` + `AbortController`) ونقل الـ ~95 مُحمّلًا إليه.

### 5.3 الثغرة المهمة: `AuthContext` غير محفوظ

🟠 **مهم** — `src/contexts/AuthContext.tsx:255-274` يمرّر كائنًا حرفيًا جديدًا إلى `value={{...}}` عند كل تصيير، والدوال `login/registerAccount/logout/refreshUser/startImpersonationPreview` تُعاد إنشاؤها كل تصيير بدل `useCallback`. مع **41 ملفًا** يستدعون `useAuth()`، فإن أي `setUser/setToken/setIsLoading` يفرض قيمة سياق جديدة ويُعيد تصيير كل الأشجار المستهلكة.

والمفارقة أن `CookieConsentContext` **في المجلّد نفسه يفعلها بشكل صحيح** (`useMemo` + `useCallback`) — فالتناقض سهو واضح.

**الإصلاح**: لفّ دوال الأفعال في `useCallback` وكائن القيمة في `useMemo` على المفاتيح `[user, token, isLoading, impersonationOriginalUser]`، محاكاةً لنمط `CookieConsentContext`.

### 5.4 hook لوحة الطالب — نقاط قوة وثغرات صغيرة

- 🟢 `useStudentDashboardData` يُمركز بيانات LMS للطالب مرة واحدة على مستوى التخطيط (`StudentDashboardProvider`)، ويحفظ كل شريحة مشتقّة بـ `useMemo`، ويستخدم `Promise.allSettled` فلا تُفرّغ نقطة فاشلة اللوحة.
- 🟡 **`load` يُعلن تبعية `userId` غير مستخدمة** (`useStudentDashboardData.ts:291`، deps `[enabled, userId]`) بينما جسمها لا يقرأ `userId` — فقط `enabled`. يُمرَّر `userId` فقط لإعادة تشغيل effect التحميل الأول. الدوال لا تأخذ `userId`، فالنطاق يأتي من الرمز عبر طبقة axios، أي أن المعامل زخرفي إلى حدّ كبير. **الإصلاح**: إزالة `userId` من deps الخاصة بـ `load` (إبقاؤها على effect التحميل الأول) + تعليق توضيحي.
- 🟡 **`useStudentLearningLists` shim لا يزال مستوردًا** (`useStudentLearningLists.ts:1-18`) — طبقة توافق خلفي تُعرّض `catalog` و`browseCourses` لنفس القيمة (أثر هجرة تسمية). **الإصلاح**: ترحيل المستدعين إلى `useStudentDashboardData` وحذف الـ shim أو وسمه `@deprecated`.
- 🟡 **ناقل تحديث عبر حدث window** (`STUDENT_SCOPE_REFRESH_EVENT`، الأسطر 301-308) — قناة تعطيل cache عامة غير منمّطة (لا payload typing، سهلة الخطأ الإملائي، غير مرئية لـ devtools). مقبول الآن، لكن يُفضَّل كشف `refresh()/invalidate()` صريح عبر `StudentDashboardContext` أو تبنّي query cache.

---

## 6. التوصية المعمارية: من الجلب اليدوي إلى طبقة حالة خادم

الثغرات الثلاث الكبرى (غياب timeout، غياب abort، غياب cache) لها **حلّ جذري واحد**: تبنّي **TanStack Query** (أو SWR) لحالة الخادم. وهي تمنح مجانًا: التخزين المؤقت، إزالة التكرار، الإلغاء، إعادة المحاولة، و stale-while-revalidate — وتسمح بحذف عشرات المُحمّلات اليدوية وتفكيك نمط `setLoading(true)` المكرّر عبر 96 ملفًا.

**مثال — هجرة `CouponsAdminPage` نموذجًا:**
```ts
// قبل: ~30 سطرًا من useState/useEffect/try-catch-finally
// بعد:
const { data: coupons = [], isLoading, error, refetch } = useQuery({
  queryKey: ['coupons', filters],
  queryFn: ({ signal }) => fetchCoupons(filters, { signal }), // الإلغاء مجانًا
})
```

**مسار الترحيل المقترح (تدريجي، غير معطِّل):**
1. إضافة `timeout: 20_000` إلى `axios.create` **الآن** (إصلاح فوري منفصل عن أي مكتبة).
2. تمرير `signal?: AbortSignal` عبر دوال الـ api الأكثر استخدامًا، أو تبنّي نمط `ignore` في المُحمّلات الحرجة.
3. إدخال `@tanstack/react-query` مع `QueryClientProvider` في `main.tsx`، وترحيل أول 5–10 صفحات عالية التكرار (الكتالوج/الإشعارات/لوحات الإدارة).
4. حذف الـ `*Api`-المحلية للـ unwrap وتوحيدها على `unwrapData`/`asList` أثناء الترحيل.

> ملاحظة: لا يلزم استبدال `AuthContext`/`CookieConsentContext` — فهما حالة عميل عامة حقيقية، وهذا هو الاستخدام الصحيح للـ Context. مكتبة الاستعلام تخصّ **حالة الخادم** فقط.

---

## 7. التوصيات (مرتّبة حسب الأولوية)

### 🔴 حرِج — يُعالَج أولًا
- [ ] **إضافة `timeout: 20_000`** إلى `axios.create` في `src/api/axios.ts:27` (مع سماح بتجاوز لكل نداء لنقاط الرفع/التقارير). أرخص إصلاح وأعلى أثرًا.
- [ ] **معالجة سباقات الإلغاء**: تبنّي نمط `ignore` في `useStudentDashboardData.ts:223-291` فورًا، ثم تمرير `signal` عبر دوال الـ api تدريجيًا. لا `setState` بعد إلغاء التركيب.

### 🟠 مهم
- [ ] **تبنّي TanStack Query** لحالة الخادم — يحلّ timeout/abort/cache/dedup دفعة واحدة ويُلغي ~95 مُحمّلًا يدويًا. ابدأ بالصفحات عالية التكرار.
- [ ] **استخراج hook عام `useResource<T>`** كحلّ وسيط إن تأجّل تبنّي المكتبة — لتوحيد سياسة loading/error/abort في مكان واحد.
- [ ] **تحفيظ `AuthContext`** (`useCallback` + `useMemo`) محاكاةً لـ `CookieConsentContext` — يوقف إعادة تصيير 41 مستهلكًا.
- [ ] **تصحيح حارس البيئة في DEV** (`axios.ts:22-25`): تحذير صريح أو افتراضي موثّق بدل الفشل الصامت.

### 🟡 ثانوي
- [ ] **إصلاح أخطاء ESLint الأربعة** في `courseLearnApi.ts:373,633`، `learningPathsApi.ts:446`، `hrDashboardApi.ts:182` لتمرير `npm run lint`.
- [ ] **توحيد دوال unwrap** على `unwrapData`/`asList` وحذف النسخ المحلية السبع؛ ودمج ملفّي الدورات المتنافسين.
- [ ] **توجيه نداءات baseURL اليدوية** عبر `getApiBaseUrl()` مركزية؛ وإصلاح تراجع `SubmissionReviewPanel.tsx:87`.
- [ ] **استدعاء `Sentry.captureException`** في كتل catch المُبتلِعة قبل إرجاع البديل الفارغ (102 موقعًا) لجعل فقدان البيانات الصامت مرئيًا.
- [ ] **تقسيم God files** (`placementApi` 1575، `studentApi` 1291، `courseLearnApi` 845) إلى `<domain>Api.ts` (نقل رقيق) + `<domain>Normalizers.ts` (مُخطِّطات نقية قابلة للاختبار).
- [ ] **تنظيف hook الطالب**: إزالة تبعية `userId` غير المستخدمة من `load`، وترحيل/حذف `useStudentLearningLists` shim، وتنميط تفاصيل `STUDENT_SCOPE_REFRESH_EVENT`.

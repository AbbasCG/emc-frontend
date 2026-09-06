# التقرير 02 — الميزات والمجالات الوظيفية

جردٌ شاملٌ لما يفعله تطبيق `emc-frontend` فعلاً، مع تقييم نضج كل مجال وظيفي على حدة.

آخر تحديث: 2026-06-21 · الفرع: dev

---

## 1. الغرض من هذا التقرير

يجيب هذا التقرير عن سؤال واحد مباشر: **«ما الذي يفعله التطبيق فعلاً؟»**. لا يتعلّق الأمر هنا بجودة الكود أو الأمن (يغطّيهما تقريرا `02-code-quality` و`03-dependencies-and-security`)، بل بجرد القدرات الوظيفية: ما الميزات الموجودة، ودرجة اكتمالها، والثغرات الوظيفية الحقيقية فيها.

التطبيق **ليس نموذجاً أوّلياً (prototype)**؛ هو منصّة تعليمية ضخمة بـ 752 ملف مصدري و~107,716 سطر برمجي (570 `.tsx` + 181 `.ts`)، تضم ~30 نطاق مكوّنات و~18 نطاق صفحات، وجدول توجيه مركزي (`src/App.tsx`، 611 سطراً، ~350 مساراً). الواجهة الأمامية React تتحدّث إلى **واجهة Laravel REST منفصلة** (القاعدة الافتراضية `http://127.0.0.1:8000/api`). التطبيق **عربيّ بالكامل، RTL**، رغم أن الـ README يَعِد بـ EN/NL/AR (وعدٌ غير محقَّق — انظر القسم 4).

### مفتاح النضج

| الرمز | المعنى | التعريف العملي |
|---|---|---|
| ✅ **مكتمل** | جاهز للإنتاج | تدفّق كامل من الواجهة إلى الـ API، حالات تحميل/خطأ/فراغ، normalization دفاعي |
| 🟨 **جزئي** | يعمل لكن بثغرات | الميزة الأساسية موجودة لكن تنقصها سيناريوهات مهمّة أو بها أخطاء مؤكّدة |
| 🟧 **هيكل أولي** | واجهة بلا عمق | روابط/لوحات تجميعية أو محتوى ثابت (hardcoded) بلا تكامل API حقيقي |

### مفتاح الخطورة

🔴 حرِج · 🟠 مهم · 🟡 ثانوي · 🟢 جيد

---

## 2. جدول النضج الموجز (نظرة عامة)

| # | المجال الوظيفي | النضج | الدليل الأساسي |
|---|---|---|---|
| 1 | الموقع التسويقي العام (Public marketing) | 🟨 جزئي | بيانات حقيقية (Programs/Courses) + صفحات ثابتة (Departments/Partnerships/Impact) |
| 2 | الدورات وتفاصيل الدورة (Courses & details) | ✅ مكتمل | `coursesApi`، `CourseDetails`، variants متعددة للعرض |
| 3 | نظام التعلّم LMS (واجبات/جلسات/حضور/تقييم شفهي) | ✅ مكتمل | ~58 صفحة + ~34 مكوّن، 0 علامات "قيد الإنشاء" |
| 4 | المسارات التعليمية (Learning paths) | ✅ مكتمل | عام + طالب + مدرّب، بحث/ترقيم خادمي |
| 5 | التسجيل والدفع (Enrollment + payments) | ✅ مكتمل | `EnrollmentForm`، stripe/paypal/fake، `checkout_url` |
| 6 | أدوات المدرّب (Instructor tools) | ✅ مكتمل | حضور بقفل، تقييم شفهي، توفّر، صفوف |
| 7 | المشرف الأعلى وRBAC/الصلاحيات | ✅ مكتمل | محرّك 20 دوراً + مصفوفة صلاحيات production-grade |
| 8 | إدارة المستخدمين (User management) | 🟨 جزئي | CRUD كامل لكن جلب-الكل-ثم-تصفية-بالـJS |
| 9 | الموارد البشرية (HR) | 🟨 جزئي | 9 صفحات + رسوم بيانية، تكامل API متفاوت |
| 10 | العمليات (Operations) | 🟨 جزئي | Kanban + Forms + تذاكر + شركاء، واسع |
| 11 | المالية والمدفوعات (Finance) | ✅ مكتمل | معاملات/مدفوعات/شهادات/كوبونات + recharts |
| 12 | الذكاء/لوحات التحليلات (Intelligence) | ✅ مكتمل | recharts بـ RTL، تصدير CSV بـ BOM |
| 13 | لوحات المديرين (Manager dashboards) | 🟧 هيكل أولي | 1 مدفوعة بالبيانات مقابل 4 لوحات روابط |
| 14 | إدارة تقنية (Tech-admin) | 🟧 هيكل أولي | لوحة واحدة (`TechAdminDashboardPage`) |
| 15 | الإعدادات (Settings) | 🟧 هيكل أولي | صفحة واحدة (تفضيلات الإشعارات) |
| 16 | تدفّقات المتطوّعين (Volunteer) | 🟨 جزئي | صفحة عامة + إدارة ops + modal تفاصيل |
| 17 | معالج النماذج (emc-form-wizard) | ✅ مكتمل | shell + 8 مكوّنات، مُستخدَم فعلياً |
| 18 | التقويم (Calendar) | ✅ مكتمل | شهر/أسبوع/يوم/قائمة + تصدير ICS |
| 19 | القانونية وموافقة الكوكيز (Legal/consent) | ✅ مكتمل | 7 وثائق مهيكلة + GDPR consent |
| 20 | الإشعارات (Notifications) | 🟨 جزئي | استطلاع كل 90ث بلا معالجة أخطاء |
| 21 | غلاف التطبيق والتوجيه والمصادقة | ✅ مكتمل | ~350 مساراً، حارسان، code-splitting |
| 22 | المنصّة المعرفية (Knowledge/Lessons/Quiz) | ✅ مكتمل | `platform/` knowledge hub + lesson player |

**الخلاصة العددية:** ✅ مكتمل = 12 · 🟨 جزئي = 6 · 🟧 هيكل أولي = 4.

> **الإطار العام:** هذا تطبيقٌ ناضج بشكل لافت في نواته (LMS، RBAC، الدفع، التقويم)، لكن "أطرافه" التنظيمية (لوحات المديرين، tech-admin، الإعدادات) ما زالت هياكل أوّلية، وموقعه التسويقي خليطٌ من بياناتٍ حيّة ومحتوى عرضٍ ثابتٍ يُقدَّم أحياناً بصفة «موثّق» (مشكلة نزاهة محتوى — انظر 3.1).

---

## 3. تفصيل المجالات الوظيفية

### 3.1 الموقع التسويقي العام — 🟨 جزئي

**ما هو موجود:** ~25 مكوّن قسم في `src/components/home/` (`HeroSection`, `HomeCinematicHero`, `HomeEcosystemBento`, `HomeImpactMetrics`, `HomeStatsBand`, `HomeTestimonialsCarousel`, `HomeFaqSection`, `HomeCourseCard`)، ومكتبة `src/components/public/` غنية (نسخ premium + detail لصفحات تفاصيل الدورات)، وأنظمة Impact/Departments/Team كاملة.

**هجين بطبيعته:**
- **مدفوع بالبيانات (API):** `Programs` (`fetchPublicProgramsOverview`)، `Courses`، `Workshops`، `Instructors`، `CourseDetails`، `InstructorDetail`، `Contact` (`submitContactMessage`).
- **ثابت بالكامل (hardcoded):** `Departments.tsx`، `Partnerships.tsx`، `Impact.tsx`، `Volunteer.tsx` — كلها نصوص عربية inline، و`Team` يسقط إلى `STATIC_TEAM_DATA`.

| الخطورة | المشكلة | الموقع |
|---|---|---|
| 🔴 | **بيانات عرض/توضيحية تُقدَّم للجمهور بصفة «موثّق»** | `src/data/impactDashboard.ts:1-3,14-22`؛ `ImpactOverviewSection.tsx:40`؛ `HomeStatsBand.tsx:7-12` |
| 🟠 | **SEO مفقود على كل صفحة معلوماتية** (`PublicSeo` على 8 من 35 صفحة فقط) | `Departments`، `Team`، `Impact`، `Partnerships`، `Volunteer`، `Contact`، `InstructorDetail` |
| 🟡 | **خطأ lint مؤكَّد**: `(startDate || hours != null || true)` — الشرط ثابت الصدق دائماً | `src/components/home/HomeCourseCard.tsx:119` (`no-constant-binary-expression`) |
| 🟡 | **خطأ lint مؤكَّد**: إنشاء مكوّن أثناء الـ render (`const Icon = resolveDepartmentIcon(...)`) | `DepartmentSection.tsx:22,39`؛ `ExecutiveSection.tsx:16,23` (`static-components`) |
| 🟡 | **نسخ تسويقية placeholder منشورة في الإنتاج** («عناوين واقعية يمكن تخصيصها لاحقاً») | `Partnerships.tsx:159-179` |
| 🟡 | `TeamPage` يستبدل أشخاصاً حقيقيين بالاسم (`STATIC_TEAM_DATA`) عند فشل/فراغ الـ API، ومسار `fetchError` ميّت لا يُضبط أبداً | `TeamPage.tsx:19,33,35-37,75-78` |
| 🟡 | `console.log` تشخيصية في مكوّن عام (محميّة بـ `import.meta.env.DEV`) | `TeamPage.tsx:28-32` |

التفصيل الحرِج لـ 🔴: ترويسة `impactDashboard.ts` تقول حرفياً «توضيحي — أرقام عرض ... يمكن لاحقاً استبداله باستجابة API»، بينما تُعرض القيم (1500+ تسجيل، 250+ جلسة، 17 دولة، 14 شريكاً) بعناوين «تسجيل موثّق» / «شريك مؤسسي»، و`HomeStatsBand` يثبّت «+500 مستفيد / +25 برنامج». تقديم أرقام توضيحية بصفة إنجازٍ موثّق لمؤسسة تعليمية مخاطرة ثقة/نزاهة حقيقية.

**الإصلاح:** اربط القيم بـ Impact API (ملف البيانات يتوقّع ذلك أصلاً) أو احذف وصف «موثّق/موثّقة». أضِف `<PublicSeo>` لكل صفحة معلوماتية (المكوّن موجود وجاهز). أزِل `|| true`. صيّر الأيقونات عبر مكوّن `<DeptIcon iconKey=.../>` مُعرَّف على مستوى الوحدة.

---

### 3.2 الدورات وتفاصيل الدورة — ✅ مكتمل

**ما هو موجود:** صفحات `Courses` و`CourseDetails` مدفوعة بالـ API بالكامل، مع `useMemo` لاشتقاق الفئات، وحارس `alive` في التنظيف، وإعادة استخدام شبكة مدمجة، وتدفّق احتياطي قوي للصور في `HomeCourseCard` (`course_image → image_url → thumbnail → image → cover_image → Unsplash fallback → gradient+icon`)، كلها بـ `loading="lazy"`. مكتبة عرض غنية: `course-detail/` (`CourseDetailTabs/Panels/MetricsDashboard`) مع نسخة `premium/` موازية (`PremiumHero`, `PremiumCurriculum`, `PremiumStickyPanel`) ونسخة `detail/`.

**ملاحظة بنيوية:** جلب الدورات مُقسَّم بين وحدتين متشابهتي الاسم — `src/api/coursesApi.public.ts` (جلب خام + normalize) و`src/services/coursesApi.ts` (mapping + mock عبر `VITE_USE_MOCK_CATALOG` + بحث) — غموضٌ حول أيهما يُستورَد (دَيْنٌ بنيوي، انظر تقرير الكود).

| الخطورة | الملاحظة |
|---|---|
| 🟢 | التدفّق مكتمل، normalization دفاعي يتحمّل أشكال envelope متعددة (`data/courses/items/results/records/rows` + paginators) عبر `extractCoursesList`/`coerceToObjectArray` |
| 🟡 | ازدواج وحدتي `coursesApi` يخلق غموضاً في الاستيراد |

---

### 3.3 نظام التعلّم LMS — ✅ مكتمل (أنضج جزء في التطبيق)

هذا **النواة الأكثر إنتاجية** في التطبيق — نظام LMS متكامل لا stub. عبر ~58 صفحة و~34 مكوّناً يغطّي: الواجبات + التسليمات + المراجعة، والجلسات بمنطق نافذة الانضمام، والحضور بقفل خادمي، وتقييم شفهي بمعايير rubric، والاختبارات التحديدية (placement). **بحث عن `TODO/FIXME/stub/coming-soon` في كل الشريحة = 0 علامات ميزة غير مكتملة.**

**المكوّنات الفعلية** (`src/components/lms/`، 17 ملفاً): `SessionCard`, `AssignmentCard`, `AssignmentSubmitModal`, `SubmissionReviewPanel`, `AttendanceTable`, `EvaluationForm`, `MaterialCard`, `ProgressRing`, `LmsStatusBadge`, `AdminLmsShell`, `CourseCmsFormModal`, `CmsSessionTimingSection`.

**التدفّقات الكاملة:**

| التدفّق | الوصف | الدليل |
|---|---|---|
| **الواجبات end-to-end** | `AssignmentCard` (بوّابة submit/resubmit عبر `isNeedsResubmission`) → `AssignmentSubmitModal` (نص + ملاحظات + ملف، حماية من التكرار) → `SubmissionReviewPanel` (score/feedback/needs_revision، معاينة + تنزيل بـ blob URL مع `revoke`) | `lms/` |
| **الحضور بقفل** | `InstructorAttendancePage` + `AttendanceTable`: تتبّع dirty، mark-all/clear، معالجة HTTP 423 Locked، حالة قفل تفاؤلية، شارات «محفوظ/مقفل» | — |
| **تقييم شفهي rubric** | `InstructorOralAssessmentsPage`: 6 معايير (نطق/قواعد/مفردات/طلاقة/فهم/ثقة، /10 لكلٍّ)، حساب تلقائي 0–100 + ربط CEFR (`LEVEL_TO_CEFR`)، عبر `completeOralAssessment()` | — |
| **الاختبار التحديدي** | `placementApi.ts` (1575 سطراً) | — |

**أكبر الصفحات** (تطبيقات حقيقية لا scaffolds): `CourseContentManagerPage` 1801 سطراً، `StudentCourseLearnPage` 1213، `InstructorAvailabilityPage` 867، `InstructorClassesPage` 816.

| الخطورة | المشكلة | الموقع |
|---|---|---|
| 🟠 | **`SessionCard` يستدعي `Date.now()` أثناء الـ render (غير نقي)** — حالة الانضمام تُحسَب مرّة ولا «تدقّ»؛ زرّ «انضم للجلسة» لا يظهر تلقائياً عند فتح النافذة (10 دقائق) | `src/components/lms/SessionCard.tsx:47` (خطأ `react-hooks/purity` المؤكَّد) |
| 🟠 | **`SubmissionReviewPanel` يتجاوز `apiClient`** — `fetch` يدوي بـ `VITE_API_URL` فقط (يفقد fallback `VITE_API_BASE_URL`) ورمز من localStorage يدوياً؛ 401 لا يفعّل منطق انتهاء الجلسة، و`alert()` بدل toast | `SubmissionReviewPanel.tsx:83-97,129` |
| 🟡 | منطق normalize للجلسات مُكرَّر ومتباعد بين `utils/lmsSession.ts` و`studentApi.ts:854+` (النسخة في studentApi أفقر) | — |

**إصلاح `SessionCard`:** ارفع الساعة إلى state: `const [now, setNow] = useState(() => Date.now())` + `useEffect` بـ `setInterval(…, 30_000)` (يُمسح عند unmount)، ثم مرِّر `now` لـ `getSessionJoinState` — يصلح الـ lint ويجعل CTA يظهر/يختفي بالزمن الحقيقي.

---

### 3.4 المسارات التعليمية — ✅ مكتمل

**ما هو موجود:** `pages/LearningPaths/index.tsx` (بحث debounced، ترقيم خادمي `per_page 12`، حالة enrolled حسب الدور)، وصفحتا تفاصيل للطالب والمدرّب، و`learning-paths/CourseSelector.tsx` (اختيار متعدد مرتَّب مع reorder). مدعومة بـ `learningPathsApi.ts` (543 سطراً). يُعرض HTML الوصف عبر DOMPurify قبل `dangerouslySetInnerHTML` في `LearningPathDetail.tsx:307`.

| الخطورة | المشكلة | الموقع |
|---|---|---|
| 🟡 | **مرشّحات `price/enrollment` تعمل على الصفحة الحالية فقط (12 عنصر) بينما الترقيم خادمي** — قد يُظهر «0 مسار» في الصفحة 1 رغم وجود مسارات مجانية لاحقاً (الكود نفسه يعترف بـ «(من X في هذه الصفحة)») | `LearningPaths/index.tsx:97-111,180-185` |
| 🟡 | خطأ lint: `fetchInstructorLearningPaths(_userId?)` يأخذ معاملاً لا يستخدمه (يوهم المستدعي بأنه يحدّد نطاق الاستعلام) | `learningPathsApi.ts:446` |

**الإصلاح:** ادفع مرشّحات السعر/التسجيل إلى الـ API (اتساقاً مع `level/featured`) أو عطّل الترقيم عند تفعيل مرشّح من جهة العميل.

---

### 3.5 التسجيل والدفع — ✅ مكتمل

**ما هو موجود:** `EnrollmentForm.tsx` بـ submit مُحصَّن بالمصادقة، تعبئة مسبقة من الملف الشخصي، منتقي دولة/هاتف، تطبيع أخطاء Laravel (422/409)، إعادة توجيه إلى `checkout_url`، وحالة نجاح بانضمام لمجتمع WhatsApp. `PaymentProviderSelector` يقدّم `stripe/paypal/fake` — والمزوّد `fake` يُخفى تلقائياً خارج DEV عبر `import.meta.env.DEV`.

| الخطورة | الملاحظة |
|---|---|
| 🟢 | التدفّق مكتمل وآمن؛ إخفاء مزوّد `fake` خارج DEV ممارسة جيدة |
| 🟡 | (ملاحظة مشتركة) لا توجد مهلة timeout على axios، فالاعتماد على نهاية الدفع البطيئة قد يُبقي spinner عالقاً — انظر 3.21 |

---

### 3.6 أدوات المدرّب — ✅ مكتمل

تتكامل مع شريحة LMS أعلاه: قفل الحضور (`InstructorAttendancePage`)، التقييم الشفهي (`InstructorOralAssessmentsPage`)، التوفّر (`InstructorAvailabilityPage` 867 سطراً)، والصفوف (`InstructorClassesPage` 816)، مدعومة بـ `instructorApi.ts` (636 سطراً). الـ API يميّز aliases مفاتيح Laravel المتعددة، والقفل مُنمذَج دفاعياً على الجانبين (UI + معالجة سباق 423).

| الخطورة | الملاحظة |
|---|---|
| 🟢 | إنفاذ القفل defense-in-depth (UI يعطّل التحرير عند `is_locked`، و`save()` يعالج 423 من الخادم) |
| 🟡 | (مشترك مع 3.3) خطأ نقاء `SessionCard` يؤثّر على عرض المدرّب أيضاً |

---

### 3.7 المشرف الأعلى وRBAC/الصلاحيات — ✅ مكتمل (أقوى أصل بنيوي)

**نواة RBAC** (`src/utils/dashboardAccess.ts`، 256 سطراً): محرّك قواعد namespace بقاعدة «أطول بادئة تفوز»، تطبيع aliases للأدوار (`teacher→instructor`، `superadmin→super_admin`)، short-circuit صريح لـ `super_admin/tech_admin`، و`getPostLoginRedirect` يتحقّق من المسار المفضّل قبل احترامه (يمنع تصعيد دور بنمط open-redirect). **مُختبَر بوحدة** (`dashboardAccess.test.ts`، 19 `it`).

**الحارسان مركَّبان فعلياً** في `App.tsx`: `ProtectedRoute` (مصادقة فقط) + `DashboardAccessGuard` (تفويض لكل مسار عبر `canAccessDashboardPath`).

**CRUD المشرف الأعلى** (`super-admin/crud/`): 12 صفحة إدارة (Programs, Tracks, Workshops, Courses, Departments, Instructors, LearningPaths, Partners, Registrations, Students, Team, Users). **مصفوفة الصلاحيات production-grade**: تتبّع dirty بمقارنة baseline، refetch بعد الحفظ، view-only عند عدم `canEdit`، معالجة مفاتيح غير معروفة من الخادم، وفرض read-only على أدوار النظام.

| الخطورة | المشكلة | الموقع |
|---|---|---|
| 🔴 | **التفويض يُنفَّذ من جهة العميل فقط** — تعديل دور `emc_user` في localStorage يتجاوز كل البوّابات؛ **يجب أن تطابق Laravel كل قاعدة namespace بالضبط** (خاصةً `/admin/impersonate/*` وCRUD المشرف الأعلى) | `dashboardAccess.ts` كاملاً؛ `DashboardAccessGuard.tsx` |
| 🟠 | **البحث العام يطلق `semanticSearch` (AI) على كل ضغطة مفتاح** بلا debounce/abort؛ استجابات قديمة تطمس الأحدث | `GlobalSearchCommand.tsx:33-36`؛ `searchApi.ts:6-26` |
| 🟡 | الانتحال (impersonation): رمز المشرف الأصلي يُخزَّن في sessionStorage نصاً صريحاً طوال جلسة المعاينة | `axios.ts:8-10,70-81`؛ `AuthContext.tsx:164-236` |
| 🟡 | 13 خطأ `react-refresh/only-export-components` (barrels تصدّر مكوّنات + helpers معاً)؛ تكرار `providerLabelAr ×4`، `hourGreeting ×9` | finance/lms/super-admin/forms |

**ملاحظة جوهرية:** نموذج RBAC الغني يخلق **إحساساً زائفاً بالإنفاذ**. عامِله كـ UX routing فقط، وأضِف اختبار contract يضمن أن قواعد الواجهة subset من سياسات الخادم.

---

### 3.8 إدارة المستخدمين — 🟨 جزئي

**ما هو موجود:** `super-admin/users/` بنية ناضجة — `SuperAdminUsersList`، `SuperAdminUsersDetail`، `SuperAdminUsersForm`، `UsersEnterpriseDetailDrawer`، إضافة إلى ملفّات سياسة (`superAdminUserPolicy.ts`، `assignableRoles.ts`، `roleScopeHints.ts`، `roleScopeTypes.ts`) — ما يدلّ على نمذجة نطاق دور متقدّمة. مدعومة بـ `adminUsersApi.ts` (649 سطراً).

| الخطورة | المشكلة | الموقع |
|---|---|---|
| 🟡 | **عروض المشرف الأعلى تجلب كل المستخدمين ثم تصفّيهم في الـ JS** بدل تصفية خادمية — لا يتوسّع مع نمو القاعدة | (سلوك موصوف في شريحة admin) |
| 🟡 | زرّ التفاصيل بلا `onClick`؛ Toggle بلا role=switch ولا label وصول | `FinanceTransactionsPage.tsx:71`؛ admin slice |

**الإصلاح:** انقل تصفية الأدوار إلى معاملات استعلام الـ API.

---

### 3.9 الموارد البشرية (HR) — 🟨 جزئي

**ما هو موجود:** 9 صفحات في `src/pages/hr/`: `HrDashboardPage`، `HrApplicationsPage`، `HrDepartmentsPage`، `HrDocumentsPage`، `HrInstructorsPage`، `HrOnboardingPage`، `HrTasksPage`، `HrTeamPage`، `HrVolunteersPage`. مدعومة بـ `hrDashboardApi.ts` ذي التطبيع الدفاعي (`HrDashboardLinkedFlags` — يحوّل 403 إلى أعلام فجوات بدل إفشال الصفحة). رسم بياني `HrDepartmentBarChart` (recharts).

| الخطورة | المشكلة | الموقع |
|---|---|---|
| 🟢 | تجميع دفاعي ممتاز: try/catch لكل مصدر + linked-flags فتفشل نهاية واحدة دون تفريغ الصفحة | `hrDashboardApi.ts:92-152` |
| 🟡 | خطأ lint: `vols = []` ثم إعادة كتابة فورية (`no-useless-assignment`) | `hrDashboardApi.ts:182` |

التقييم 🟨 لأن تغطية الـ API عبر الصفحات التسع متفاوتة، مع اعتماد على أعلام الفجوات بدل تكاملٍ كامل لكل صفحة.

---

### 3.10 العمليات (Operations) — 🟨 جزئي

**ما هو موجود (واسع):** 19 صفحة في `operations/admin/` تشمل: لوحة عمليات (`OperationsDashboardPage`)، أقسام (`OpsDepartments` + تفاصيل)، **نماذج** (`OpsForms` + create + detail)، تسويق (`OpsMarketing`)، اجتماعات (`OpsMeetings` + detail)، شركاء (`OpsPartners`، `OpsPartnershipRequests`)، **تذاكر دعم** (`OpsSupportTickets` + detail)، **مهام بـ Kanban** (`OpsTasksKanban` + List + My + Overdue)، ومتطوّعون (`OpsVolunteers` + detail). صفحات عامة: `PartnershipApplyPage`، `PublicFormPage`، `SupportPage`. خطّاف عالي الجودة `useTasksWorkspace.ts` (تحديثات تفاؤلية مع rollback، deps صحيحة لـ `useCallback`) — **هو النموذج الذي يجب أن يحتذيه باقي التطبيق.**

| الخطورة | الملاحظة |
|---|---|
| 🟢 | `useTasksWorkspace` يثبت أن الفريق قادر على كتابة خطّافات ممتازة (optimistic UI + rollback) |
| 🟡 | السطح واسع جداً وتغطية الـ API لكل صفحة متفاوتة (لذا 🟨 لا ✅) |

---

### 3.11 المالية والمدفوعات — ✅ مكتمل

**ما هو موجود:** `intelligence/admin/` يضم `FinanceDashboardPage`، `FinanceTransactionsPage`، `FinancePaymentsPage`، `CertificatesAdminPage`، `CouponsAdminPage`، `ScholarshipsAdminPage`، إضافة إلى `FinanceRechartsSection`. تصدير CSV يكتب UTF-8 **BOM** ليفتح صحيحاً في Excel. رسوم recharts مصقولة بتلميحات عربية وحالات فراغ.

| الخطورة | المشكلة | الموقع |
|---|---|---|
| 🟢 | جلب نظيف (cancelled-flag cleanup، `Promise.all`)، حالات تحميل/فراغ/خطأ شاملة |
| 🟡 | نطاق المالية مثبّت على سنة 2026 حرفياً بدل اشتقاقه من اليوم | finance slice |
| 🟡 | تكرار `providerLabelAr` رغم وجود `financeTablesShared.tsx` | finance slice |

---

### 3.12 الذكاء/لوحات التحليلات — ✅ مكتمل

**ما هو موجود:** `intelligence/admin/` يضم أيضاً `KpiAdminPage`، `QualityAdminPage`، `ReportsAdminPage`. recharts مُستخدَم في 4 ملفات (كلها صفحات lazy)، مع نمط RTL سليم (`dir ltr` للرسم داخل `dir rtl`)، تسميات عربية، وتلميحات مخصّصة. (recharts 3.8 في حزمة منفصلة `vendor-charts` 306KB.)

| الخطورة | الملاحظة |
|---|---|
| 🟢 | معالجة RTL/i18n قوية للرسوم؛ حالات فراغ احتياطية |

---

### 3.13 لوحات المديرين — 🟧 هيكل أولي

**ما هو موجود:** 5 صفحات في `manager-dashboards/`. لكن **واحدة فقط مدفوعة بالبيانات** (`ProgramsManagerDashboardPage`، 338 سطراً) مقابل **أربع لوحات روابط رفيعة بلا KPI**: `CommunityManagerDashboardPage`، `OperationsManagerDashboardPage`، `PartnershipsManagerDashboardPage`، `SectionLeadDashboardPage`.

| الخطورة | المشكلة | الموقع |
|---|---|---|
| 🟧 | **4 من 5 لوحات مجرّد محاور روابط (link-hubs) بلا KPI ولا تكامل API**، بخلاف `ProgramsManager` المدفوعة بالبيانات | `manager-dashboards/` |

**الإصلاح:** حقّق تكافؤ اللوحات — اجلب KPIs حقيقية للمديرين الأربعة على نسق `ProgramsManager`.

---

### 3.14 إدارة تقنية (Tech-admin) — 🟧 هيكل أولي

**ما هو موجود:** صفحة واحدة `TechAdminDashboardPage.tsx`. الدور `tech_admin` يحظى بـ god-mode في RBAC، لكن سطح الواجهة المخصّص له يقتصر على لوحة واحدة. (مهام تقنية أعمق — automations/webhooks/integrations — تقع تحت `platform/admin/`، انظر 3.22.)

| الخطورة | الملاحظة |
|---|---|
| 🟧 | السطح المخصّص للدور صفحة واحدة فقط؛ هيكل أوّلي |

---

### 3.15 الإعدادات — 🟧 هيكل أولي

**ما هو موجود:** صفحة واحدة `settings/NotificationPreferencesPage.tsx`. لا توجد إعدادات حساب/ملف شخصي/أمان منفصلة كنطاق إعدادات مكتمل.

| الخطورة | الملاحظة |
|---|---|
| 🟧 | نطاق الإعدادات يقتصر على تفضيلات الإشعارات؛ هيكل أوّلي |

---

### 3.16 تدفّقات المتطوّعين — 🟨 جزئي

**ما هو موجود:** صفحة عامة (تُقدَّم عبر `Volunteer.tsx` الثابتة)، إدارة في العمليات (`OpsVolunteersPage` + `OpsVolunteerDetailPage`)، صفحة مشرف أعلى (`super-admin/VolunteerRequestsPage.tsx`)، صفحة HR (`HrVolunteersPage`)، و`VolunteerRequestDetailModal.tsx` (أحد modals قليلة تعالج Escape).

| الخطورة | المشكلة | الموقع |
|---|---|---|
| 🟨 | صفحة الهبوط العامة `Volunteer.tsx` ثابتة بالكامل (نصوص inline)، بينما إدارة الطلبات مدفوعة بالـ API — تدفّق مختلط | `Volunteer.tsx` |

---

### 3.17 معالج النماذج (emc-form-wizard) — ✅ مكتمل

**ما هو موجود:** `src/components/emc-form-wizard/` يضم `FormWizardShell` + 8 مكوّنات (`FormStepper`، `FormProgressBar`، `FormSectionCard`، `FormChecklist`، `FormSummaryPanel`، `FormHelpCard`، `FormActions`، `FormSuccessState`) + رموز تصميم `emcWizardTokens.ts` + `index.ts` barrel. **مُستخدَم فعلياً** (لا مكتبة ميّتة): `CourseProgramFormModal.tsx`، `UsersManagementPage.tsx`. ويتوازى معه نظام بناء نماذج تشغيلي (`FormBuilder` + `OpsForms` + `PublicFormPage`).

| الخطورة | الملاحظة |
|---|---|
| 🟢 | معالج متعدد الخطوات كامل (stepper + progress + checklist + summary + success state)، مُتبنّى في صفحات حقيقية |

---

### 3.18 التقويم — ✅ مكتمل

**ما هو موجود:** `CalendarPage.tsx` بأربعة عروض (شهر/أسبوع/يوم/قائمة عبر `CalendarMonthView/WeekView/DayView/ListView` + `CalendarViewSwitcher`)، تفضيل عرض محفوظ، إنشاء مُقيَّد بالدور، تأكيد حذف، **تصدير ICS** (تنزيل blob)، ورسائل فراغ خاصة بكل دور. مدعوم بـ `calendarApi.ts` (297 سطراً).

| الخطورة | المشكلة | الموقع |
|---|---|---|
| 🟢 | عروض متعدّدة + ICS + حالات فراغ مميّزة لكل سيناريو |
| 🟡 | نموذج الإنشاء أضيق من تصنيف التقويم (8 أنواع لكن الإنشاء يسمح بـ meeting/event/task فقط)، و`set(k, v: string)` يمرّر قيماً غير مكتوبة الأنواع (typo في `<option>` يُمرَّر دون فحص حتى الـ API) | `CalendarPage.tsx:43-52,238,291-348` |

---

### 3.19 القانونية وموافقة الكوكيز — ✅ مكتمل

**ما هو موجود:** `src/components/legal/` يضم `LegalDocumentLayout`، `CookieBanner`، `CookiePreferencesModal`، مدعومة بـ **7 وثائق مهيكلة مكتوبة الأنواع** في `src/data/legal/*.ts` (privacy/terms/refund/cookies/accessibility/complaints/disclaimer). موافقة GDPR عبر `CookieConsentContext` (يُمَيِّم القيمة بـ `useMemo` ويغلّف الأفعال بـ `useCallback` — النمط الصحيح). **التحليلات (GA/Meta Pixel) تُحمَّل فقط بعد الموافقة** (خصوصية جيدة).

| الخطورة | الملاحظة |
|---|---|
| 🟢 | محتوى قانوني مُخرَج خارجياً لوحداتٍ مكتوبة الأنواع؛ تحميل التحليلات مشروط بالموافقة (احترام خصوصية) |

---

### 3.20 الإشعارات — 🟨 جزئي

**ما هو موجود:** `NotificationsCenterPage.tsx` + drawer في `DashboardLayout`، باستطلاع دوري. مسارات الإشعارات مُختبَرة بوحدة (`notificationRoutes.test.ts`، 15 `it`، تحظر URLs خارجية/api).

| الخطورة | المشكلة | الموقع |
|---|---|---|
| 🟡 | **`refreshNotifications` يعمل دون شرط** عند mount + حدث نافذة + `setInterval` كل 90ث لكل مستخدم بصرف النظر عن الدور/الرؤية، **بلا معالجة خطأ** على الوعد؛ الأدوار بلا صلاحية إشعارات تُصيب 404/403 كل 90ث | `DashboardLayout.tsx:617-640` |

**الإصلاح:** اربط الاستطلاع بـ `document.visibility` و/أو بصلاحية الدور، وأضِف `.catch`.

---

### 3.21 غلاف التطبيق والتوجيه والمصادقة — ✅ مكتمل

**ما هو موجود:** جدول توجيه مركزي (`App.tsx`، 611 سطراً، ~350 مساراً، ~190 `React.lazy`)، شجرة providers نظيفة، حارسان (`ProtectedRoute` + `DashboardAccessGuard`)، اعتراضات axios مدركة للرمز، و`ErrorBoundary` مرتبط بـ Sentry. الانتحال (impersonation) مُطبَّق بعناية (نسخ احتياطي + استعادة عند 401). الصفحات 401/403/404/500 موصولة.

| الخطورة | المشكلة | الموقع |
|---|---|---|
| 🔴 | **JWT في localStorage** (`emc_token` + كائن المستخدم) مكشوفٌ لأي XSS — أكثر متّجهات سرقة الرموز شيوعاً، يتفاقم مع dompurify ذي ثغرة معروفة | `AuthContext.tsx:66,82,117-118`؛ `axios.ts:36-39` |
| 🟠 | **لا timeout على axios إطلاقاً** — على خادم بطيء، الجلب (وضمنه fan-out لوحة الطالب ذو 11 نهاية) لا يستقرّ أبداً وspinner عالق | `axios.ts:27-32` (0 `timeout` في كل المشروع) |
| 🟠 | **لا AbortController/cancellation في أي مكان** — سباقات + setState بعد unmount عبر ~150 موقع `useEffect` | `useStudentDashboardData.ts:223-291`؛ 0 نتائج لـ `AbortController|signal:` |
| 🟡 | **Suspense وحيد فوق `DashboardLayout`** يهدم الغلاف كله على ~152 مساراً (وميض كامل بدل spinner في منطقة المحتوى) | `App.tsx:341-347` مقابل ~152 عنصر lazy بلا Suspense داخلي |
| 🟡 | **لا 404 داخل لوحة التحكم** — مسارات `/dashboard/*` المجهولة تُعاد بصمت إلى صفحة الدور (typo لا يُمَيَّز عن منع وصول) | `App.tsx:348-596`؛ `DashboardAccessGuard.tsx:40-41` |
| 🟡 | `SectionErrorBoundary` مبنيّ لكنه غير مُستخدَم (0 استخدامات فعلية) — أي خطأ render يُفرّغ التطبيق كله | `errors/SectionErrorBoundary.tsx` |
| 🟡 | `PartnerLayout` يتيم (dead code) — مسارات الشريك تُصيَّر داخل `DashboardLayout` المشترك | `layouts/PartnerLayout.tsx:16` |

**ملاحظة:** هذه المجموعة من الثغرات تشغيلية (timeout/abort/Suspense)، لا تمنع كون الغلاف مكتملاً وظيفياً، لكنها تخفض جودة التجربة تحت ظروف الشبكة الحقيقية.

---

### 3.22 المنصّة المعرفية (Knowledge / Lessons / Quiz) — ✅ مكتمل

**ما هو موجود:** `src/pages/platform/` يضم `KnowledgeHubPage`، `KnowledgeArticlePublicPage`، `LessonPlayerPage`، `QuizTakePage`، `CourseModulesPage`، `DocumentsPage`، `StudentLearningHubPage`، `NotificationsCenterPage`، `AiWorkspacePage`. وإدارة في `platform/admin/`: knowledge hub (create/edit/categories)، automations + runs، webhooks + detail، integrations، audit logs، LMS structure، documents، `PlatformScaleDashboardPage`، `AdminMobileReadinessPage`. وبوّابة شريك (`platform/partner/`: dashboard/documents/programs/reports). محتوى HTML للمقالات والدروس يُعقَّم عبر DOMPurify (`KnowledgeArticlePublicPage.tsx:68`، `LessonPlayer.tsx:68`).

| الخطورة | الملاحظة |
|---|---|
| 🟢 | hub معرفي + lesson player + quiz + automations/webhooks — تطبيقات حقيقية لا scaffolds |
| 🟠 | (مشترك) DOMPurify ^3.4.5 يحمل تحذير MODERATE حيّاً وهو خطّ الدفاع الفعلي ضد XSS هنا — يجب الرفع إلى >=3.4.11 |

---

## 4. ثغرة عرضية كبرى عبر كل المجالات: i18n مفقود

رغم وعد الـ README بـ **EN/NL/AR**، التطبيق **عربيّ-فقط مُثبَّت بنيوياً**:

| الحقيقة | القيمة |
|---|---|
| مكتبة i18n | **لا شيء** (لا i18next/react-intl/formatjs/lingui) |
| استدعاءات `t('` | **0** |
| ملفات تحوي نصوصاً عربية inline | **545 من 752** |
| `index.html` | مثبَّت `<html lang="ar" dir="rtl">` |
| مبدّل لغة | **لا شيء** (فقط `CountrySelect` لرمز الهاتف) |
| `dir="rtl"` literals | 386 (+ 170 `dir="ltr"`) |
| خصائص CSS منطقية | **0** (فيزيائية بالكامل) |

> **الأثر الوظيفي:** أي ادّعاء بدعم EN/NL غير صحيح حالياً؛ إضافتهما تتطلّب لمس كل ملف تقريباً. عامِل EN/NL كبند خارطة طريق لا قدرة قائمة (التفصيل في تقرير `05-ux-i18n-accessibility`).

---

## 5. التوصيات (مرتَّبة لهذا التقرير)

### أولوية فورية — نزاهة المحتوى والصحة الوظيفية
- [ ] 🔴 **أزِل وصف «موثّق» عن أرقام العرض** في `impactDashboard.ts` / `ImpactOverviewSection.tsx:40` / `HomeStatsBand.tsx`، أو اربطها بـ Impact API الحقيقي. لا تُقدِّم أرقاماً توضيحية بصفة إنجازٍ موثّق.
- [ ] 🔴 **أكِّد أن Laravel يطابق كل قاعدة RBAC** (`dashboardAccess.ts`) خادمياً — التفويض الحالي UX فقط وقابل للتجاوز بتعديل localStorage.
- [ ] 🟠 **أصلِح نقاء `SessionCard`** (`SessionCard.tsx:47`): ارفع الساعة إلى state + `setInterval` 30ث، فيظهر زرّ الانضمام بالزمن الحقيقي.
- [ ] 🟠 **وجِّه تنزيل ملف `SubmissionReviewPanel` عبر `apiClient`** (`responseType:'blob'`) بدل `fetch` اليدوي الذي يفقد fallback `VITE_API_BASE_URL` ولا يعالج 401.

### أولوية مرتفعة — اكتمال السطح وكفاءة الجلب
- [ ] 🟠 **حقّق تكافؤ لوحات المديرين الأربع** مع `ProgramsManagerDashboardPage` (KPIs مدفوعة بالبيانات).
- [ ] 🟠 **أضِف `<PublicSeo>`** لكل صفحة معلوماتية (Departments/Team/Impact/Partnerships/Volunteer/Contact/InstructorDetail).
- [ ] 🟠 **Debounce + abort للبحث العام** (`GlobalSearchCommand.tsx:33-36`) قبل استدعاء `semanticSearch`.
- [ ] 🟠 **أضِف `timeout` افتراضياً (مثلاً 20000ms) إلى `axios.create`** ومرِّر `AbortSignal` عبر دوال الـ API.

### أولوية متوسطة — جودة التجربة والنظافة الوظيفية
- [ ] 🟡 أضِف Suspense داخلياً حول `<Outlet/>` في `DashboardLayout.tsx:734` فيبقى الغلاف مثبَّتاً.
- [ ] 🟡 أضِف 404 داخل لوحة التحكم (`<Route path="*" .../>` داخل شجرة الحارس).
- [ ] 🟡 لفّ `<Outlet/>` بـ `SectionErrorBoundary` الموجود (المبنيّ وغير المستخدَم).
- [ ] 🟡 ادفع مرشّحات السعر/التسجيل للمسارات التعليمية إلى الـ API بدل تصفية الصفحة الحالية.
- [ ] 🟡 انقل تصفية أدوار إدارة المستخدمين إلى الخادم (بدل جلب-الكل-ثم-تصفية-JS).
- [ ] 🟡 اربط استطلاع الإشعارات بـ `document.visibility` وأضِف `.catch` (`DashboardLayout.tsx:617-640`).
- [ ] 🟡 احذف placeholder النسخ التسويقية المنشورة (`Partnerships.tsx:159-179`) واحسم سلوك `TeamPage` (إظهار خطأ أو إخفاء fallback خلف flag، وحذف مسار `fetchError` الميّت).
- [ ] 🟡 أزِل `|| true` من `HomeCourseCard.tsx:119`، وصيّر أيقونات الفريق عبر مكوّن على مستوى الوحدة (`DepartmentSection`/`ExecutiveSection`).

### بند خارطة طريق
- [ ] 🟡 **i18n**: تبنَّ react-i18next، اجعل ar لغة المصدر، وهاجِر النصوص تدريجياً (ابدأ بـ shared/ui + nav + الصفحات العامة) قبل أي ادّعاء بدعم EN/NL.

---

*انتهى التقرير 02. للسياق المكمّل: `00-executive-summary.md` (الملخّص التنفيذي)، `03-dependencies-and-security.md` (الأمن والتبعيات)، `05-ux-i18n-accessibility.md` (الوصول وi18n).*

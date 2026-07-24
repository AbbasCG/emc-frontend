# خريطة المسارات والتنقّل — تقييم M2a

> **المشروع:** emc-frontend (`C:\EMC\WEP`) — React 19 + react-router-dom v7
> **تاريخ التحليل:** 2026-07-24 · **الفرع:** dev
> **المصادر المفحوصة:** `src/App.tsx` (721 سطرًا)، `src/components/Navbar.tsx` (481)، `src/layouts/dashboardSidebar.tsx` (769)، `src/components/ProtectedRoute.tsx`، `src/components/DashboardAccessGuard.tsx`، `src/utils/dashboardAccess.ts`، صفحات الكتالوج الخمس، `src/components/Footer.tsx`، مواصفات `e2e/journeys/*`
> **السياسة الحاكمة:** الإخفاء أولًا (Hide-first) — جميع المسارات تبقى **وظيفية**؛ لا حذف لأي مسار أو ملف في M2a.

---

## 1. الأرقام الإجمالية

| المؤشر | القيمة | ملاحظة |
|---|---:|---|
| أسطر `path=` في `App.tsx` | **342** | ملف مسارات واحد مركزي — لا ملفات مسارات متداخلة أخرى |
| مسارات فعلية وقت التشغيل | **~348** | سطر `ALL_LEGAL_DOCUMENTS.map` الواحد يولّد 7 مسارات قانونية |
| استيرادات كسولة `lazy()` | **219** | تقسيم حِزم جيد؛ الصفحات الحرجة فقط eager (Home, Login, ...) |
| مسارات تحويل (Redirect) | **70** | 68 `<Navigate>` + مكوّنا تحويل ديناميكيان (`RedirectAdminWebhookDetail`, `RedirectPathsToLearningPaths`) — أي **~20%** من المسارات مجرد أسماء بديلة |
| مسارات عنصر نائب «قريبًا» | **4** | تُصيّر `AdminComingSoonPage` |
| مسارات بيئة التطوير فقط | **1** | `/fake-payment/:paymentId` خلف `import.meta.env.DEV` |

### طبقات الحراسة (Guards)

| الطبقة | الملف | ما تفرضه |
|---|---|---|
| `Layout` | `src/components/Layout.tsx` | عام — Navbar + Footer، **بلا حارس** |
| `ProtectedRoute` | `src/components/ProtectedRoute.tsx` | **مصادقة فقط** (جلسة صالحة)، وإلا تحويل إلى `/login` مع حفظ الوجهة |
| `DashboardLayout` | `src/layouts/DashboardLayout.tsx` | قشرة الشريط الجانبي + الشريط العلوي (lazy) |
| `DashboardAccessGuard` | `src/components/DashboardAccessGuard.tsx` + `src/utils/dashboardAccess.ts` | **تفويض حسب الدور**: قواعد نطاقات مرتبة بأطول بادئة (`DASHBOARD_NAMESPACE_RULES`)؛ `super_admin` و`tech_admin` يتجاوزان كل القيود؛ `/documents` `/calendar` `/ai` و`/dashboard/profile|notifications|settings|members` متاحة لأي مستخدم مصادَق؛ `workshop-requests` مفتوحة لـ 14 دورًا؛ `department/financial-requests` مصادقة فقط (الخادم يفرض `is_leader`) |

19 دورًا معرّفًا في `EMC_DASHBOARD_ROLES` مع أسماء بديلة قديمة (`teacher→instructor`, `finance→finance_manager`, ...).

---

## 2. جرد المسارات حسب المجال

### 2.1 المساحة العامة (حارس: لا شيء — `Layout` فقط)

| المجموعة | العدد | مسارات ممثلة | ملاحظات |
|---|---:|---|---|
| عام / تسويقي | 30 | `/`, `/courses`, `/courses/:slug`, `/workshops(/:slug)`, `/learning-paths(/:slug)`, `/programs`, `/tracks`, `/instructors(/:slug)`, `/about`, `/contact`, `/departments`, `/platform`, `/team`+`/ar/team`, `/impact`+`/ar/impact`, `/partnerships`, `/knowledge(/:slug)`, `/support`, `/thank-you`, `/forms/:slug` | منها 3 تحويلات: `/themes→/tracks`, `/paths(/:slug)→/learning-paths` |
| دخول وحساب | 5 | `/login`, `/signup`, `/register`, `/forgot-password`, `/reset-password` | `/register` و`/courses/:slug/register` يصيّران نفس مكوّن `Register` |
| تطوّع وسفراء وشراكات (نماذج) | 6 | `/volunteer(/apply)`, `/ambassador(/apply, /application-success)`, `/partnerships/apply`, `/submit-workshop` | |
| قانوني | 7 | `/privacy`, `/terms`, `/cookies`, `/refund-policy`, `/disclaimer`, `/complaints`, `/accessibility` | تتولد من `src/data/legal` — كلها `LegalPage` واحدة |
| تحقق شهادات | 1 | `/certificates/verify/:code` | عام بلا مصادقة |
| أخطاء | 5 | `/401`, `/403`, `/404`, `/500`, `*` (NotFound) | |
| تطوير فقط | 1 | `/fake-payment/:paymentId` | DEV فقط |
| **المجموع العام** | **~50** | | |

### 2.2 لوحات التحكم (حارس: `ProtectedRoute` → `DashboardAccessGuard`)

| المجموعة | العدد | منها تحويلات | مسارات ممثلة | الأدوار المسموحة |
|---|---:|---:|---|---|
| أسماء بديلة «جميلة» خارج `/dashboard` | 16 | 16 | `/admin/integrations→/dashboard/admin/integrations`, `/partner/dashboard→/dashboard/partner`, `/settings/notifications`, `/admin/ai/*` | مصادقة (تحويل فوري) |
| طالب LMS `/dashboard/student` | 31 | 8 | `courses`, `learn/:courseId`, `learning-paths(/:id)`, `sessions(/:id)`, `assignments`, `attendance`, `materials`, `progress`, `exams`, `placement-test/result`, `oral-booking`, `orders`, `payment-success`, `calendar` | `student` |
| LMS متقدم مشترك | 7 | 0 | `/dashboard/learning`, `/dashboard/courses/:id/modules`, `/dashboard/lessons/:id`, `/dashboard/quizzes/:id`, `/dashboard/certificates`, `/dashboard/courses/:id/content` | طالب؛ و`content` للإداريين والمدرّبين |
| مدرّب `/dashboard/instructor` | 23 | 0 | `courses(+content, students, placement-students)`, `classes(/:groupId/:tab)`, `sessions(/:id)`, `attendance(+dashboard, reports)`, `submissions`, `assignments/dashboard`, `missing-submissions`, `oral-assessments`, `availability`, `placement-tests`, `calendar`, `learning-paths(/:id)` | `instructor` (+ تحويل `/dashboard/teacher/*`) |
| تقويم وأدوات معرفية عامة | 6 | 0 | `/calendar`, `/documents`, `/ai`, `/dashboard/notifications`, `/dashboard/settings(/notifications)`, `/dashboard/profile` | أي مستخدم مصادَق |
| إدارة — LMS `/dashboard/admin/lms` | 7 | 0 | `sessions`, `attendance`, `assignments`, `materials`, `evaluations`, `progress`, `courses/:id/content` | `admin`, `super_admin`, `programs_manager` |
| إدارة — عمليات | ~18 | 0 | `departments(/:id)`, `tasks(+kanban, my, overdue)`, `meetings(/:id)`, `forms(+create, :id)`, `volunteers(/:id)`, `partners`, `partnership-requests`, `marketing`, `support-tickets(/:id)` | `admin`, `super_admin` + مدراء متخصصون حسب البادئة |
| إدارة — مالية | 17 | 0 | `/dashboard/finance/*` (9: payments, transactions, orders, invoices, financial-requests, accounts, manual-payments, program-approvals) + مرآة كاملة `/dashboard/admin/finance/*` (8) | `finance_manager` للأولى؛ `admin/super_admin` للمرآة |
| إدارة — شهادات | 11 | 0 | `/dashboard/admin/certificates` (+issue, templates, designer, batches, analytics, overview, :id) + نسختا `programs-manager` | `admin`, `super_admin` (+`programs_manager`) |
| إدارة — منصة/AI/تقنية | ~18 | 0 | `modules`, `lessons`, `quizzes`, `automations(+runs)`, `documents`, `audit-logs`, `platform-scale`, `integrations(+whatsapp, email)`, `webhooks(/:id)`, `developer/api-tokens`, `mobile-readiness`, `ai(+automations, insights, usage)`, `knowledge(+categories, articles)` | `admin`, `super_admin`, `tech_admin` |
| إدارة — أسماء بديلة | 30 | 30 | `/dashboard/admin/sessions→lms/sessions`, `grants→scholarships`, `tests→quizzes`, `development→automations`, ... | تحويلات صرفة |
| super-admin CRUD | 29 | 5 | `crud/users`, `roles`, `departments`, `team`, `students`, `instructors`, `programs(+/:id/content)`, `workshops`, `registrations`, `partners`, `learning-paths` + `audit-logs`, `product-updates`, `financial-requests`, `volunteer-requests(/:id)`, `ambassador-applications(/:id)`, `email-settings`, `email-logs`, `attendance-settings` | `super_admin` فقط |
| جودة `/dashboard/quality` | 12 | 2 | `reviews`, `incidents`, `corrective-actions`, `checklists`, `compliance`, `governance`, `audit-logs`, `reports`, `team` | `quality_manager` |
| موارد بشرية `/dashboard/hr` | 12 | 0 | `team`, `volunteers`, `instructors`, `departments`, `onboarding`, `tasks`, `documents`, `volunteer-requests(/:id)`, `ambassador-applications(/:id)` | `hr_manager` |
| شركاء `/dashboard/partner` | 5 | 0 | `programs`, `reports`, `documents` | `partner` |
| لوحات المدراء المتخصصين | 14 | 0 | `executive` (6), `department` (4), `tech-admin` (2), `programs-manager` (4), `operations-manager`, `partnerships-manager`, `community-manager`, `section-lead` (1 لكل منها) | كل دور لبادئته |
| تطوّع وأعضاء ودعم | 8 | 0 | `/dashboard/volunteer(/:id)`, `/dashboard/ops/volunteers`, `/dashboard/members`, `/dashboard/support(/:id)`, `/dashboard/marketing` | حسب القواعد |
| طلبات الورش | 2 | 0 | `/dashboard/admin/workshop-requests(/:id)` | 14 دورًا |
| اختصارات إدارية عريضة | 7 | 3 | `/dashboard/students` (فعلية)، `/dashboard/courses|programs|reports` (تحويلات)، `/dashboard/registrations|schedule|users` (**قريبًا**) | `admin`, `super_admin` |

---

## 3. تصنيف المجموعات والمسارات

### 3.1 التصنيف العام

| التصنيف | المجموعات / المسارات | التبرير |
|---|---|---|
| **أساسي** (قيمة مستخدم جوهرية) | `/` · `/courses(+/:slug, register)` · `/workshops(/:slug)` · `/learning-paths(/:slug)` · `/instructors` · الدخول والتسجيل · طالب LMS كاملًا · مدرّب كاملًا · إدارة LMS + الشهادات · super-admin CRUD · المالية · `/calendar` `/notifications` `/profile` · طلبات الورش · القانوني (التزام) | مسارات الرحلات الأساسية المغطاة بـ e2e |
| **ثانوي** (يكفي وصول من أسطح ثانوية: Footer/بطاقات/روابط داخلية) | `/tracks` · `/platform` · `/departments` · `/team` `/impact` · `/knowledge` · `/support` · `/ambassador` · `/volunteer` · `/partnerships` · لوحات الجودة وHR والمدراء المتخصصين · `/certificates/verify` | محتوى داعم أو جمهور متخصص؛ لا يحتاج مكانًا في الشريط العلوي |
| **مكرَّر** (وجهة متداخلة — التوأم مذكور) | انظر §3.3 | |
| **مرشَّح للإخفاء** (قديم/عنصر نائب/غير قابل للوصول) | انظر §6 | |

### 3.2 تحليل تداخل الكتالوج: `/courses` مقابل `/programs` مقابل `/workshops` مقابل `/learning-paths` مقابل `/tracks`

| المسار | الملف | ماذا يصيّر فعليًا | مصدر البيانات | الحكم |
|---|---|---|---|---|
| **`/courses`** | `src/pages/Courses/index.tsx` (277 سطرًا + 14 مكوّنًا فرعيًا ≈ 2,300 سطر) | **الكتالوج القانوني الأغنى**: Hero ببحث وتصنيفات وإحصاءات حية (`h1` = «استكشف برامجنا» — **مثبَّت في e2e**) + شريط فلاتر (سعر/نمط/مستوى/نوع/توفر/فرز/عرض) + شبكة الدورات **والورش معًا** + مقتطف مسارات التعلم + Spotlight للورش القادمة + CTA | `fetchCourses` + `fetchPublicLearningPaths` + `fetchUpcomingWorkshops` (3 APIs) | **أساسي — الكتالوج القانوني الوحيد** |
| **`/programs`** | `src/pages/Programs/index.tsx` (258 سطرًا) | نفس `fetchCourses` لكن **يستبعد الورش** (`catalog_type !== 'workshop'`)، ويعيد استخدام `FilterBar` و`CoursesGrid` **نفسيهما من مجلد Courses** مع فلاتر إضافية (لغة/مدرّب/تصنيف) | `fetchCourses` (نفس API) | **مكرَّر — توأمه `/courses`**؛ عرض مُرشّح من نفس البيانات بنفس المكوّنات. يبقى وظيفيًا ويُخفى من الشريط العلوي (موجود أصلًا في الـ Footer) |
| **`/workshops`** | `src/pages/Workshops/index.tsx` (297 سطرًا) | كتالوج ورش كامل ومستقل: بحث + فلاتر (موقع/سعر/حالة/مدرّب) + ترقيم صفحات | `fetchPublicWorkshopsPage` (API مختلف، بطاقات مختلفة) | **أساسي** — القائمة الكاملة الوحيدة للورش (`/courses` يعرض Spotlight فقط) |
| **`/learning-paths`** | `src/pages/LearningPaths/index.tsx` (250 سطرًا + 3 مكوّنات) | كتالوج مسارات فريد: فلاتر + وعي بحالة الالتحاق للطالب المسجّل | `fetchPublicLearningPaths` + `fetchStudentLearningPaths` | **أساسي** — محتوى فريد |
| **`/tracks`** | `src/pages/Tracks.tsx` (168 سطرًا + `TracksPageContinued`) | صفحة **ثابتة بالكامل**: 12 بطاقة مجال من `data/publicPages.themes12`، كل CTA فيها يوجّه إلى `/courses` | بيانات ثابتة، لا API | **ثانوي — غلاف رقيق** يقود إلى `/courses`؛ يكفيه Footer + قسم داخل الكتالوج (`/themes` يحوّل إليه) |
| `/paths` | (مسار تحويل) | يحوّل إلى `/learning-paths` — **لكن الملف `src/pages/Paths.tsx` يتيم تمامًا** (غير مستورد في أي مكان) | — | مرشَّح M2b |

**الخلاصة:** `/courses` هو الكتالوج القانوني ويجب أن يبقى وجهة CTA الرئيسي. `/programs` نسخة مُرشّحة مكررة تُخفى من التنقل الأول. `/workshops` و`/learning-paths` كتالوجان متخصصان حقيقيان يبقيان في القائمة المنسدلة. `/tracks` غلاف ثابت يُنقل إلى الـ Footer (موجود فيه أصلًا باسم «المجالات»).

### 3.3 المكررات الأخرى (المسار ← توأمه)

| المسار المكرَّر | التوأم القانوني | الطبيعة |
|---|---|---|
| `/register` | `/courses/:slug/register` | نفس مكوّن `Register` |
| `/team`, `/impact` | `/ar/team`, `/ar/impact` | نفس المكوّن بمسارين (الـ Navbar يستخدم `/ar/team`) |
| `/dashboard/admin/certificates/overview` | `/dashboard/admin/certificates` | نفس `AdminCertificatesLmsPage` |
| `/dashboard/instructor/workshops` | `/dashboard/instructor/courses` | نفس `InstructorAssignedCoursesPage` |
| `/dashboard/admin/finance/*` (8 مسارات) | `/dashboard/finance/*` | مرآة كاملة لنفس الصفحات باختلاف الدور |
| `/dashboard/volunteer` (المقبولون) و`/dashboard/admin/volunteers` و`/dashboard/ops/volunteers` | ثلاث بوابات متداخلة للمتطوعين | صفحات مختلفة لكن التسميات في الشريط الجانبي متضاربة (انظر §5) |
| 70 مسار تحويل | وجهاتها القانونية | مقصودة (توافق روابط قديمة) — تبقى |

---

## 4. الشريط العلوي: الوضع الحالي واقتراح ≤ 5 عناصر

### 4.1 الوضع الحالي (`src/components/Navbar.tsx`)

**6 عناصر** في سطح المكتب (تتكرر نفسها في قائمة الجوال من نفس المصفوفات):

| العنصر | النوع | عدد الروابط | الوجهات |
|---|---|---:|---|
| الرئيسية | رابط | 1 | `/` |
| عن EMC | Mega (`aboutItems`) | 6 | `/about` (+3 anchors), `/impact`, `/ar/team` |
| البرامج | Mega (`programsItems`) | 7 | `/courses`, `/workshops`, `/learning-paths`, `/programs`, `/tracks`, `/instructors`, `/submit-workshop` |
| المركز | Mega (`centerItems`) | 3 | `/departments` (+anchor), `/platform` |
| الشراكات | رابط مستقل | 1 | `/partnerships` |
| انضم إلينا | Mega (`joinItems`) | 6 | `/signup`, `/contact#trainer`, `/partnerships/apply`, `/volunteer`, `/ambassador`, `/contact` |

المجموع: **24 وجهة** موزعة على 6 عناصر — قائمة «البرامج» وحدها تحوي 3 كتالوجات متداخلة (`/courses`, `/programs`, `/tracks`).

### 4.2 الاقتراح: 4 عناصر + زر CTA

| # | العنصر | المحتوى | التغيير |
|---|---|---|---|
| 1 | **الرئيسية** | `/` | كما هو |
| 2 | **البرامج** (Mega — 5 روابط) | `/courses` «البرامج والدورات» (القانوني) · `/workshops` · `/learning-paths` · `/instructors` · `/tracks` «المجالات» *(اختياري — يمكن الاكتفاء بالـ Footer)* | **يُحذف من القائمة**: `/programs` (مكرَّر — يبقى وظيفيًا وموجود في Footer)، `/submit-workshop` (ينتقل إلى «انضم إلينا») |
| 3 | **عن EMC** (Mega — 5 روابط) | `/about` · `/impact` · `/ar/team` · `/departments` «الإدارات والحوكمة» · `/platform` «المنصة» | **يبتلع قائمة «المركز» كاملة**؛ تُحذف روابط الـ anchors الثلاثة (`#vision-mission`, `#roadmap`, `#leadership`) لأنها تنقّل داخل `/about` نفسها |
| 4 | **انضم إلينا** (Mega — 7 روابط) | `/partnerships` «الشراكات — نظرة عامة» *(يُضاف)* · `/signup` · `/contact#trainer` · `/partnerships/apply` · `/volunteer` · `/ambassador` · `/submit-workshop` *(ينتقل هنا)* · `/contact` | **يبتلع رابط «الشراكات» المستقل** — منطقيًا كل بنودها «انضمام» |
| CTA | تسجيل الدخول / لوحة التحكم + قائمة المستخدم | كما هي | لا تغيير |

**Footer فقط (بلا شريط علوي):** `/programs`، `/tracks` (إن حُذف من القائمة)، `/support` *(يُضاف للـ Footer)*، `/knowledge` *(يُضاف)*، `/certificates/verify` *(اختياري)*، الصفحات القانونية السبع (موجودة). ملاحظة: الـ Footer الحالي يحوي أصلًا `/programs`, `/tracks`, `/platform`, `/submit-workshop` — أي أن أغلب «الإخفاء» مؤمَّن سلفًا بسطح ثانوي.

### 4.3 سلامة اختبارات e2e — تنبيه ملزم

- `e2e/journeys/browse-enroll.spec.ts` يثبّت: زر البطل **«استكشف البرامج والمسارات»** (في `src/components/home/HomeCinematicHero.tsx:243` → يقود إلى `/courses`) و`h1` الكتالوج **«استكشف برامجنا»** (`src/pages/Courses/CoursesHero.tsx:134`). **الاقتراح أعلاه لا يلمس أيًّا من النصين ولا وجهة `/courses`** — ممنوع تغييرهما أثناء التنفيذ.
- `submit-workshop.spec.ts` يثبّت `h1` «تقديم ورشة عمل» على `/submit-workshop` — نقل رابطها بين القوائم آمن ما دام المسار نفسه حيًّا، لكن يجب إبقاء الصفحة قابلة للوصول.
- `roles-notifications.spec.ts` يثبّت عنوان «لوحة القيادة التنفيذية» — لا علاقة له بالتنقل العام لكن يمنع تغيير عنوان لوحة `executive`.

---

## 5. الأشرطة الجانبية (`src/layouts/dashboardSidebar.tsx`)

### 5.1 الوضع الحالي لكل دور

| الدور | عدد المجموعات | إجمالي العناصر تقريبًا | القابلة للطي | ملاحظات |
|---|---:|---:|---|---|
| `super_admin` | 7 | ~42 | **1 فقط** (CRUD) | مجموعة «لوحات الأدوار» تضم 16 عنصرًا غير قابلة للطي — أطول شريط في المنصة |
| `tech_admin` | 7 | ~40 | **6** (كلها عدا «الحساب»)، الأولى مفتوحة والبقية مغلقة | **النمط النموذجي** |
| `admin` | 7 | ~35 | 5 (اثنتان مفتوحتان، ثلاث مغلقة) | **خلل**: «طلبات التطوع» و«المتطوعون» عنصران مختلفا الاسم لنفس الوجهة `/dashboard/admin/volunteers` (سطرا 187 و189) |
| `quality_manager` | 6 | ~14 | 0 | مجموعات صغيرة كثيرة قابلة للدمج |
| `hr_manager` | 5 | ~14 | 0 | |
| `finance_manager` | 4 | ~14 | 0 | مجموعة واحدة بـ 10 عناصر |
| `executive_admin` | 4 | ~11 | 0 | |
| `programs_manager` | 4 | ~16 | 0 | |
| `operations_manager` / `partnerships_manager` / `community_manager` | 4–5 | ~11 | 0 | |
| `partner`, `department_manager`, `section_lead`, `marketing`, `support`, `volunteer` | 3–4 | ≤9 | 0 | صغيرة — لا تحتاج طيًّا |
| `student` | 1 | 10 | — | قائمة مسطحة واحدة |
| `instructor` | 1 | 10 | — | قائمة مسطحة واحدة |

البنية تدعم الطي أصلًا: `SidebarNavGroup.collapsible` + `defaultOpen` مع حفظ الحالة في `localStorage` — المطلوب تفعيل الأعلام فقط.

### 5.2 النمط الموحّد المقترح (نمط tech_admin)

**القاعدة:** أي شريط جانبي يتجاوز **12 عنصرًا** أو **4 مجموعات** → كل مجموعاته المعنونة `collapsible: true`، الأولى `defaultOpen: true` والبقية `false`. الأشرطة الصغيرة (طالب، مدرّب، أدوار الخدمة) تبقى مسطحة.

| الدور | الإجراء |
|---|---|
| `super_admin` | إضافة `collapsible: true, defaultOpen: false` لمجموعات «لوحات الأدوار» و«العمليات والإيرادات» و«المنصّة» و«التواصل والمعرفة»؛ إبقاء «إدارة الكيانات (CRUD)» كما هي مع `defaultOpen: true` |
| `admin` | **إزالة العنصر المكرر** «المتطوعون» (سطر 189) والإبقاء على «طلبات التطوع»؛ الأعلام الحالية جيدة |
| `quality_manager` | دمج «المراجعة والتقييم» + «الإدارة والمتابعة» في مجموعة واحدة، وجعل المجموعات قابلة للطي |
| `hr_manager`, `finance_manager`, `programs_manager`, `executive_admin` | `collapsible: true` للمجموعات المعنونة، الأولى مفتوحة |
| البقية | بلا تغيير |

---

## 6. مرشَّحو الإخفاء / الشيفرة الميتة (قائمة مرشحين فقط — الحذف يحتاج بوابة M2b مستقلة)

### 6.1 ملفات صفحات يتيمة (صفر مراجع في `src/` — غير موصولة بأي مسار)

| الملف | السبب |
|---|---|
| `src/pages/Paths.tsx` | المسار `/paths` أصبح تحويلًا إلى `/learning-paths`؛ الملف لم يعد يُستورد |
| `src/pages/super-admin/crud/TracksManagementPage.tsx` | `/crud/tracks` يحوّل إلى `crud/learning-paths` |
| `src/pages/super-admin/users/SuperAdminUsersList.tsx`, `SuperAdminUsersForm.tsx`, `SuperAdminUsersDetail.tsx` | مسارات `crud/users/new|:id|:id/edit` أصبحت تحويلات إلى `crud/users` |
| `src/pages/super-admin/crud/shared/CrudPageShell.tsx`, `ManagementPageShell.tsx`, `EntityStatsCards.tsx` | قشور مشتركة لم يعد يستخدمها أحد |
| `src/pages/hr/HrApplicationsPage.tsx` | غير موصول؛ استُبدل بـ `volunteer-requests` / `ambassador-applications` |
| `src/pages/intelligence/admin/CertificatesAdminPage.tsx` | استُبدل بمنظومة الشهادات في `lms/admin/*` |
| `src/pages/lms/student/StudentEvaluationPage.tsx` | `/dashboard/student/evaluation` يحوّل إلى `/dashboard/student` |
| `src/pages/Courses/CoursesPricingSection.tsx`, `CoursesProgramIntro.tsx`, `CoursesRegistrationSection.tsx`, `LearningPathsShowcaseSection.tsx`, `TracksSection.tsx` | أقسام قديمة من كتالوج سابق لم تعد تُركَّب في `Courses/index.tsx` |

**المجموع: 15 ملفًا** يتيمًا (تُحذف لاحقًا فقط عبر بوابة M2b مع تشغيل typecheck + e2e).

### 6.2 مسارات عنصر نائب («قريبًا» — `AdminComingSoonPage`)

| المسار | الظهور في الشريط الجانبي |
|---|---|
| `/dashboard/admin/users` | لا يظهر حاليًا |
| `/dashboard/registrations` | نعم — «التسجيلات» في شريط `admin` |
| `/dashboard/schedule` | لا |
| `/dashboard/users` | نعم — «المستخدمون» في شريط `admin` |

**اقتراح:** إعادة توجيه عنصري الشريط الجانبي إلى الصفحات الفعلية (`/dashboard/admin/registrations` و`/dashboard/super-admin/crud/users`) بدل صفحتي «قريبًا» — تحرير سطرين في `dashboardSidebar.tsx` دون لمس المسارات.

### 6.3 أخرى

- `/fake-payment/:paymentId` — مقيّد سلفًا بـ DEV؛ لا إجراء.
- `/dashboard/admin/certificates/overview` و`/dashboard/instructor/workshops` — توأمان (§3.3)؛ يبقيان وظيفيين، لا يُروَّج لهما في أي قائمة.

---

## 7. خطة تنفيذ M2a — التحريرات الدقيقة

> **مبدأ:** 3 ملفات فقط تُعدَّل. لا يُلمس `App.tsx` إطلاقًا (كل المسارات تبقى حية)، ولا أي نص تعتمد عليه اختبارات e2e.

### الخطوة 1 — `src/components/Navbar.tsx` (التنقل ≤ 5)

1. **`programsItems` (الأسطر 46–54):** حذف عنصري `/programs` («البرامج») و`/submit-workshop`؛ يتبقى 5 عناصر (`/courses`, `/workshops`, `/learning-paths`, `/instructors`, `/tracks`).
2. **`aboutItems` (الأسطر 37–44):** حذف عناصر الـ anchors الثلاثة (`#vision-mission`, `#roadmap`, `#leadership`)؛ إضافة عنصري `centerItems`: `/departments` و`/platform`.
3. **حذف `centerItems` (الأسطر 56–60)** وكل استخداماتها: `MegaDropdown` «المركز» في سطح المكتب (الأسطر 201–209) وبند `['center', 'المركز', centerItems]` في مصفوفة الجوال (السطر 354).
4. **`joinItems` (الأسطر 62–69):** إضافة `{ href: '/partnerships', label: 'الشراكات — نظرة عامة' }` أول القائمة، وإضافة `/submit-workshop` («تقديم ورشة»).
5. **حذف `NavLink` «الشراكات» المستقل**: سطح المكتب (الأسطر 211–216) والجوال (الأسطر 416–427).
6. **تحديث `megaPrefixes` (الأسطر 73–78):** نقل `/departments` و`/platform` إلى `about`، وإضافة `/partnerships` و`/submit-workshop` إلى `join`، وإزالة `/programs` (أو إبقاؤه في `programs` لتظليل التبويب عند الوصول من الـ Footer — الأفضل إبقاؤه)، وحذف مفتاح `center` من النوع `MegaId`.
7. قائمة الجوال تقرأ من المصفوفات نفسها — لا عمل إضافي.

### الخطوة 2 — `src/components/Footer.tsx` (الأسطح الثانوية)

- إضافة `{ label: 'الدعم', href: '/support' }` و`{ label: 'مركز المعرفة', href: '/knowledge' }` إلى مجموعة الروابط (بعد السطر 25). روابط `/programs`, `/tracks`, `/platform`, `/submit-workshop` موجودة سلفًا — تبقى.

### الخطوة 3 — `src/layouts/dashboardSidebar.tsx` (توحيد الأشرطة)

1. **إصلاح التكرار (سطر 189):** حذف عنصر «المتطوعون» المكرر في `adminSuperAdminSidebar` (نفس وجهة «طلبات التطوع»).
2. **`superMasterSidebar` (الأسطر 223–292):** إضافة `collapsible: true, defaultOpen: false` لمجموعات «لوحات الأدوار (وصول كامل)» و«العمليات والإيرادات» و«المنصّة»؛ وإبقاء CRUD مفتوحة.
3. **`quality_manager` (الأسطر 456–495) و`hr_manager` (497–527) و`finance_manager` (434–454) و`programs_manager` (637–676) و`executive_admin` (415–432):** إضافة `collapsible: true` للمجموعات المعنونة (الأولى `defaultOpen: true`).
4. **(اختياري ضمن نفس الملف):** توجيه «التسجيلات» إلى `/dashboard/admin/registrations` و«المستخدمون» إلى `/dashboard/super-admin/crud/users` بدل صفحتي «قريبًا» (السطران 156–157) — مع ملاحظة أن `crud/users` محمي لـ `super_admin` بينما يتجاوز `admin` العادي لن يصل؛ الأسلم توجيه «المستخدمون» لدور admin إلى `/dashboard/admin/users` كما هو الآن وإرجاء المعالجة إلى M2b.

### الخطوة 4 — التحقق

```
npm run typecheck && npm run test:e2e   # browse-enroll, submit-workshop, login-learn, roles-notifications, smoke
```

- التأكد يدويًا: تظليل التبويب النشط بعد تعديل `megaPrefixes`؛ قائمة الجوال؛ وصول `/programs` و`/tracks` من الـ Footer.

### أهم المخاطر

| الخطر | التخفيف |
|---|---|
| كسر نصوص e2e (زر البطل / `h1` الكتالوج) | الخطة لا تلمسهما — حظر صريح على تغييرهما |
| فقدان تظليل التبويب النشط لمسارات نُقلت بين القوائم | تحديث `megaPrefixes` إلزامي في نفس الـ commit |
| مستخدمون معتادون على «الشراكات» كعنصر مستقل | بقيت أول عنصر في «انضم إلينا» وفي الـ Footer |
| حالة `localStorage` القديمة لمجموعات الشريط الجانبي | `defaultOpen` يُطبَّق فقط عند غياب قيمة محفوظة — سلوك آمن |
| حذف الملفات اليتيمة (§6.1) | **خارج نطاق M2a** — بوابة M2b مستقلة |

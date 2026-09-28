# تقرير تدقيق Responsive للصفحات الفرعية

**المشروع:** `emc-frontend`  
**الفرع:** `mokh-sept-28`  
**تاريخ التدقيق:** 2026-09-28  
**نطاق المراجعة:** لوحة التحكم، صفحات الأدوار، صفحات LMS، المالية، الموارد البشرية، العمليات، السوبر أدمن، والجداول والمكونات المشتركة.

> هذا التقرير مبني على فحص المصدر مع التركيز على عرض الهاتف المرجعي `375px`. وجود نمط مثل `min-w-[860px]` لا يعني بالضرورة وجود خلل؛ إذا كان داخل حاوية `overflow-x-auto` فهو غالبًا سلوك مقصود، لكنه يحتاج تحققًا بصريًا ويدويًا على الهاتف.

---

## 1. الملخص التنفيذي

### ما تم إصلاحه بالفعل

تم تعديل `src/layouts/DashboardLayout.tsx` في نقطتين:

1. إخفاء زر **لوحة التشغيل** من شريط العنوان تحت `640px` حتى لا يضغط أزرار القائمة والبحث والإشعارات والحساب.
2. إضافة `overflow-x-hidden` إلى غلاف لوحة التحكم لمنع تمدد الصفحة بالكامل بسبب عنصر فرعي غير مضبوط، مع الإبقاء على التمرير الداخلي للجداول والكانبان.

اختبار الهاتف العام مرّ بنجاح:

- **8/8** اختبارات smoke على عرض `375px`.
- `npm run build` ناجح.
- `npm run typecheck:strict` ناجح.

### النتيجة العامة للتدقيق

يوجد عدد من الصفحات التي تحتاج **مراجعة Responsive مخصصة**، ويمكن تقسيمها إلى:

| الفئة | التقدير | المعالجة المقترحة |
|---|---:|---|
| شبكات ثابتة من 3 أعمدة على الهاتف | عالية | تحويلها إلى عمود واحد أو عمودين في الهاتف |
| أشرطة فلاتر تحتوي على `min-w` | عالية | `flex-wrap` أو تخطيط عمودي تحت `sm` |
| جداول عريضة | متوسطة | الإبقاء على التمرير الداخلي، مع تحسين مؤشر التمرير وعرض الهاتف |
| تبويبات وكانبان | متوسطة | تمرير أفقي داخلي مقصود مع منع تمدد الصفحة |
| نوافذ جانبية وModals | متوسطة | التأكد من `inset-x-3` و`max-h` و`overflow-y-auto` |

---

## 2. قواعد الإصلاح المعتمدة

### 2.1 البطاقات والإحصائيات

لا تستخدم `grid-cols-3` بدون breakpoint في الهاتف إلا إذا كانت العناصر صغيرة جدًا ومختبرة بصريًا.

```tsx
// قبل
<div className="grid grid-cols-3 gap-4">

// بعد - بطاقات محتوى
<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

// بعد - مؤشرات قصيرة
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
```

### 2.2 أشرطة البحث والفلاتر

```tsx
// قبل
<div className="flex items-center gap-3">

// بعد
<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
```

لحقول البحث ذات `min-w`:

```tsx
// قبل
<div className="relative min-w-[220px] flex-1">

// بعد
<div className="relative min-w-0 flex-1 sm:min-w-[220px]">
```

ولضمان امتلاء العرض على الهاتف:

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[220px]">
```

### 2.3 الجداول

```tsx
<div className="w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-2xl">
  <table className="w-full min-w-[700px] text-right text-sm">
    ...
  </table>
</div>
```

لا يُنصح بتغيير `min-w-[700px]` إلى `w-full` إذا كانت الأعمدة تحتاج مساحة؛ الأفضل عزل التمرير داخل الحاوية.

### 2.4 الأزرار في رؤوس الصفحات

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
  <div className="min-w-0">العنوان والوصف</div>
  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
    ...
  </div>
</div>
```

---

# 3. الصفحات ذات الأولوية العالية

## 3.1 صفحات تحتوي على `grid-cols-3` مباشر على الهاتف

هذه الصفحات هي أول مجموعة يجب مراجعتها بصريًا؛ عرض `375px` يعطي كل بطاقة تقريبًا 110–115px فقط بعد الحواف والفواصل.

### 1. `src/pages/finance/ProgramApprovalsPage.tsx:199`

**المشكلة المحتملة:** شبكة إحصائيات ثابتة من 3 أعمدة.

```tsx
// المقترح
<div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
```

إذا كانت الإحصائيات قصيرة جدًا:

```tsx
<div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
```

ويجب التأكد من أن جدول الطلبات عند السطر `232` داخل `overflow-x-auto`، وهو موجود حاليًا.

---

### 2. `src/pages/quality/QualityTeamPage.tsx:41,128`

**المشكلة المحتملة:** شبكتان من 3 أعمدة لإحصائيات أو بيانات الفريق.

```tsx
// المقترح للسطر 41
<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">

// المقترح للسطر 128 إذا كانت البطاقات تحتوي نصوصًا أطول
<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
```

يفضل اختبار النص العربي الطويل داخل كل بطاقة، وعدم الاكتفاء بتصغير الخط.

---

### 3. `src/pages/quality/QualityCompliancePage.tsx:44`

**المشكلة المحتملة:** ثلاث بطاقات على صف واحد في الهاتف.

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
```

القسم الآخر في السطر `82` يستخدم `grid-cols-1 md:grid-cols-3` وهو مناسب للهاتف، ولا يحتاج تغييرًا إلا إذا ظهرت مشكلة في عرض البطاقة.

---

### 4. `src/pages/quality/QualityDashboardPage.tsx:489,773`

**المشكلة المحتملة:** مجموعات إحصائية ثلاثية داخل لوحة الجودة.

```tsx
// المقترح
<div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
```

```tsx
// المقترح للقسم الثاني
<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
```

إذا كانت القيم رقمية قصيرة يمكن إبقاء `grid-cols-2`، أما إذا كانت تسميات طويلة فالأفضل `grid-cols-1` على الهاتف.

---

### 5. `src/pages/dashboard/MembersPage.tsx:374,1221`

**المشكلة المحتملة:** شبكة مشروطة قد تتحول إلى 3 أعمدة على الهاتف، بالإضافة إلى شبكة ثابتة من 3 أعمدة.

```tsx
// قبل
<div className={`grid gap-2 ${restrictDepartment ? 'grid-cols-1' : 'grid-cols-3'}`}>

// بعد
<div className={`grid gap-2 ${restrictDepartment ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
```

```tsx
// المقترح للسطر 1221
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
```

يجب التحقق أيضًا من عدم قص أسماء الأعضاء أو الأرقام داخل البطاقات الصغيرة.

---

### 6. `src/pages/student/StudentOrdersPage.tsx:68`

**المشكلة المحتملة:** 3 بطاقات إحصائية على عرض الهاتف.

```tsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
```

إذا كانت البطاقات تحتوي عنوانًا ووصفًا، فالأفضل:

```tsx
<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
```

---

### 7. `src/pages/platform/admin/AdminLmsStructurePages.tsx:1129`

**المشكلة المحتملة:** شبكة ثلاثية داخل صفحات إدارة بنية LMS.

```tsx
<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
```

يوجد في الملف أيضًا:

- تبويب أفقي عند السطر `493`، وهو يحتاج تمريرًا داخليًا.
- حقل `min-w-[180px]` عند السطر `819`.
- حقل `min-w-[220px]` عند السطر `1384`.

المقترح للحقول:

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[180px]">
```

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[220px]">
```

---

### 8. `src/pages/lms/admin/AdminLmsSessionsPage.tsx:574`

**المشكلة المحتملة:** شبكة ثابتة من 3 أعمدة في لوحة إدارة الجلسات.

```tsx
<section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
```

وحقل البحث عند السطر `846`:

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[220px]">
```

---

### 9. `src/pages/lms/instructor/InstructorSessionDetailPage.tsx:216`

**المشكلة المحتملة:** شبكة ثلاثية داخل تفاصيل جلسة المدرب.

```tsx
<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
```

---

### 10. `src/pages/lms/instructor/InstructorClassWorkspacePage.tsx:426,726`

**المشكلة المحتملة:** شبكات ثلاثية قد تنتج نصًا صغيرًا أو أزرارًا ضيقة.

```tsx
<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
```

ويُفضل استخدام `min-w-0` داخل كل عنصر:

```tsx
<div className="min-w-0 rounded-xl ...">
```

---

### 11. `src/pages/lms/instructor/InstructorAssignedCoursesPage.tsx:156`

**المشكلة المحتملة:** شريط مؤشرات من 3 أعمدة على الهاتف.

```tsx
<div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
```

إذا كانت التسميات طويلة، استخدم:

```tsx
<div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
```

---

### 12. `src/pages/lms/instructor/InstructorPlacementStudentsPage.tsx:231`

**المشكلة المحتملة:** شبكة من 3 أعمدة تتحول إلى 6 أعمدة في سطح المكتب، لكن الهاتف يحتاج التأكد من قراءة النص.

```tsx
<div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-6">
```

إذا كانت الخلايا تعرض نصوصًا وصفية، فالأفضل `grid-cols-1 sm:grid-cols-3 lg:grid-cols-6`.

---

### 13. `src/pages/lms/admin/AdminLmsProgressPage.tsx:155`

```tsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
```

التبويبات عند السطر `400` تحتوي `whitespace-nowrap` و`overflow-x-auto` في الحاوية؛ هذا سلوك مناسب، ويجب فقط التأكد من وجود مؤشر بصري للتمرير.

---

## 3.2 صفحات أشرطة الفلاتر ذات `min-w`

هذه المجموعة معرضة للتمدد الأفقي إذا كان الأب `flex-nowrap` أو لا يسمح بالالتفاف.

### 14. `src/pages/finance/FinanceOrdersPage.tsx:358`

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[180px]">
```

ويجب أن يكون الأب:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
```

---

### 15. `src/pages/admin/AdminRegistrationsPage.tsx:601`

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[200px]">
```

المقترح لرأس الفلاتر:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
```

---

### 16. `src/pages/admin/AcceptedVolunteersPage.tsx:619`

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[180px]">
```

وتبقى شبكة النتائج عند السطر `697` مناسبة لأنها تبدأ بعمودين:

```tsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
```

لكن يجب اختبار العناوين العربية الطويلة داخل البطاقات.

---

### 17. `src/pages/super-admin/crud/DepartmentsManagementPage.tsx:608`

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[220px]">
```

كما يجب أن يكون شريط الفلاتر:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
```

الأزرار الجانبية في نوافذ التفاصيل تستخدم `flex-1`؛ على الهاتف هذا مناسب إذا كان الأب `flex-col`، ويجب التحقق من ذلك.

---

### 18. `src/pages/super-admin/crud/RegistrationsManagementPage.tsx:351,365,381,392,402`

**المشكلة المحتملة:** خمس حقول بحدود دنيا بين `120px` و`200px`.

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
  <label className="flex w-full min-w-0 flex-1 flex-col gap-1 text-right sm:min-w-[200px]">
    ...
  </label>
  <label className="flex w-full min-w-0 flex-1 flex-col gap-1 text-right sm:min-w-[150px]">
    ...
  </label>
</div>
```

لا يُنصح بجمع جميع الحقول في صف واحد على الهاتف.

---

### 19. `src/pages/super-admin/VolunteerRequestsPage.tsx:380,398`

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[200px]">
```

```tsx
<select className="h-11 w-full min-w-0 ... sm:min-w-[160px]">
```

---

### 20. `src/pages/super-admin/AmbassadorApplicationsPage.tsx:611`

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[220px]">
```

الجدول عند السطر `792` يحتاج فقط إلى عزل تمرير داخلي.

---

### 21. `src/pages/operations/WeeklyReportsPage.tsx:521`

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[220px]">
```

لاحظ أن جدول الصفحة مخفي تحت `sm` عند السطر `599`، لذلك يجب التأكد من وجود **عرض بطاقات بديل** على الهاتف وليس مجرد إخفاء الجدول.

---

### 22. `src/pages/operations/admin/OpsSupportTicketsPage.tsx:784`

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[200px]">
```

ويجب جعل شريط الفلاتر عموديًا على الهاتف.

---

### 23. `src/pages/lms/instructor/InstructorAllStudentsPage.tsx:141`

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[180px]">
```

---

### 24. `src/pages/lms/instructor/InstructorCourseStudentsPage.tsx:121`

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[180px]">
```

---

### 25. `src/pages/lms/instructor/InstructorQuizzesPage.tsx:551`

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[200px]">
```

والجدول عند السطر `582` يجب أن يبقى داخل:

```tsx
<div className="w-full min-w-0 overflow-x-auto rounded-3xl ...">
```

---

### 26. `src/pages/lms/admin/AdminCertificateIssuePage.tsx:653`

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[150px]">
```

---

### 27. `src/components/finance/FinancePaymentsActivity.tsx:73`

```tsx
<div className="relative w-full min-w-0 flex-1 sm:min-w-[200px]">
```

والقيمة المالية ذات `whitespace-nowrap` يجب أن تبقى داخل عنصر يسمح للعنوان المجاور بالالتفاف، مثل:

```tsx
<div className="min-w-0 flex-1">
  <p className="truncate">...</p>
</div>
<span className="shrink-0 whitespace-nowrap">...</span>
```

---

# 4. صفحات الجداول التي تحتاج مراجعة

## 4.1 جداول تمتلك تمريرًا داخليًا مناسبًا غالبًا

هذه الصفحات تحتوي بالفعل على `overflow-x-auto`. المطلوب ليس إزالة العرض الأدنى، بل اختبار تجربة التمرير، اتجاه RTL، وعدم تمدد `body`:

| الصفحة | السطر/النمط | العرض الأدنى |
|---|---:|---:|
| `src/pages/WorkshopRequestsPage.tsx` | 396–397 | `700px` |
| `src/pages/finance/ProgramApprovalsPage.tsx` | 231–232 | `700px` |
| `src/pages/hr/HrVolunteersPage.tsx` | 54–55 | `640px` |
| `src/pages/hr/HrTasksPage.tsx` | 66–67 | `760px` |
| `src/pages/hr/HrOnboardingPage.tsx` | 55–56 | `600px` |
| `src/pages/hr/HrApplicationsPage.tsx` | 50–51 | `560px` |
| `src/pages/resources/ResourceCenterCoursesPage.tsx` | 515–516 | `860px` |
| `src/pages/super-admin/EmailLogsPage.tsx` | 832–833 | `700px` |
| `src/pages/super-admin/AmbassadorApplicationsPage.tsx` | 791–792 | `860px` |
| `src/pages/super-admin/SuperAdminOverviewPage.tsx` | 970–971 | `560px` |
| `src/pages/super-admin/crud/RolesPermissionsPage.tsx` | 203–204 | `640px` |
| `src/components/finance/transactions/TransactionsTable.tsx` | 47–48 | `960px` |
| `src/components/finance/manual-payments/ManualPaymentsTable.tsx` | 43–44 | `1100px` |
| `src/components/finance/command-center/RecentTransactions.tsx` | 79–80 | `720px` |
| `src/pages/operations/admin/VisitorAnalyticsPage.tsx` | 240–241 | `44rem` |
| `src/pages/operations/admin/OpsFormDetailPage.tsx` | 120–121 | `480px` |
| `src/pages/operations/OperationsBoardPage.tsx` | 539–540 | `56rem` |
| `src/pages/operations/ImpactPointsPage.tsx` | 310–311 | `38rem` |
| `src/pages/operations/admin/OpsConsultantApplicationsPage.tsx` | 144–145 | `52rem` |
| `src/pages/lms/instructor/InstructorSubmissionsPage.tsx` | 445–446 | `760px` |
| `src/pages/lms/instructor/InstructorQuizzesPage.tsx` | 581–582 | `720px` |

### الكود الموحد المقترح

لأي جدول في القائمة أعلاه:

```tsx
<div className="w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-2xl">
  <table className="w-full min-w-[760px] text-right text-sm">
    ...
  </table>
</div>
```

ويُستحسن إضافة تلميح نصي لا يظهر إلا على الهاتف في الجداول المهمة:

```tsx
<p className="mb-2 text-[11px] text-slate-400 sm:hidden">
  اسحب أفقيًا لعرض بقية الأعمدة
</p>
```

## 4.2 جداول تحتاج التأكد من بديل الهاتف

### `src/components/finance/transactions/TransactionsTable.tsx`

الجدول مكتوب كـ `hidden ... md:block`، وتوجد بطاقة هاتف باسم `MobileTransactionCard`. يجب التأكد من أن البديل يظهر فعليًا عند `max-width: 767px`:

```tsx
<div className="md:hidden">
  {items.map((item) => <MobileTransactionCard key={item.id} item={item} />)}
</div>
<div className="hidden overflow-x-auto md:block">
  <table>...</table>
</div>
```

### `src/components/finance/manual-payments/ManualPaymentsTable.tsx`

الجدول مخفي على الهاتف. يجب التأكد من وجود بطاقة أو قائمة بديلة، وإلا ستظهر صفحة المدفوعات ناقصة.

```tsx
<div className="md:hidden space-y-3">
  {items.map((item) => <ManualPaymentCard key={item.id} item={item} />)}
</div>
<div className="hidden overflow-x-auto md:block">
  <table>...</table>
</div>
```

### `src/pages/operations/WeeklyReportsPage.tsx`

الجدول مخفي تحت `sm`؛ يجب إضافة عرض بطاقات أو صفوف مختصرة بدل ترك المنطقة فارغة.

---

# 5. التبويبات والكانبان

## 5.1 `src/pages/operations/OperationsBoardPage.tsx`

يوجد تمرير أفقي للكانبان، وهو مناسب وظيفيًا. يجب التأكد من أن التمرير على الحاوية الداخلية فقط:

```tsx
<div className="w-full min-w-0 overflow-x-auto overscroll-x-contain pb-4">
  <div className="flex min-w-max gap-4">
    ...
  </div>
</div>
```

لا تضف `overflow-x-hidden` إلى عنصر الكانبان نفسه، حتى لا تمنع المستخدم من الوصول إلى الأعمدة.

## 5.2 `src/components/operations/KanbanBoard.tsx`

```tsx
<div className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-4">
  <div className="flex min-w-max gap-4">
    ...
  </div>
</div>
```

## 5.3 `src/components/operations/MarketingKanban.tsx`

التصميم الحالي يستخدم `max-w-full overflow-x-auto`، وهو جيد. المراجعة المطلوبة هي التأكد من أن كل عمود لديه عرض ثابت مناسب:

```tsx
<div className="w-[min(86vw,20rem)] shrink-0 sm:w-[20rem]">
  ...
</div>
```

## 5.4 `src/pages/platform/admin/AdminLmsStructurePages.tsx:493`

```tsx
<div className="w-full min-w-0 overflow-x-auto border-b ...">
  <div className="flex min-w-max gap-0 px-4">
    ...
  </div>
</div>
```

## 5.5 `src/pages/lms/student/StudentCourseLearnPage.tsx:818`

الموجود حاليًا قريب من الحل المطلوب؛ يجب الإبقاء على `overflow-x-auto`، مع التأكد من أن كل تبويب لديه `shrink-0` و`whitespace-nowrap`.

## 5.6 `src/pages/lms/instructor/InstructorLearningPathDetailPage.tsx:237`

المعالجة المقترحة:

```tsx
<div className="sticky ... w-full min-w-0 overflow-x-auto">
  <div className="flex min-w-max gap-1">
    ...
  </div>
</div>
```

---

# 6. النوافذ الجانبية وModals

هذه ليست بالضرورة أخطاء، لكنها تحتاج اختبارًا على ارتفاع هاتف صغير مثل `667px`، وليس العرض فقط.

### `src/pages/admin/AdminRegistrationsPage.tsx:183`

المقترح:

```tsx
<div className="fixed inset-x-0 bottom-0 top-0 z-50 flex w-full min-w-0 flex-col overflow-hidden bg-white sm:inset-x-auto sm:w-[480px]">
  <div className="min-h-0 flex-1 overflow-y-auto">
    ...
  </div>
</div>
```

### `src/pages/super-admin/crud/TeamManagementPage.tsx:641,1003`

المقترح الحفاظ على `inset-x-4`، وإضافة صراحة:

```tsx
<div className="fixed inset-x-3 top-4 z-modal-content mx-auto flex max-h-[calc(100dvh-2rem)] w-auto max-w-md flex-col overflow-hidden rounded-3xl bg-white sm:inset-x-auto sm:w-[440px]">
  <div className="min-h-0 flex-1 overflow-y-auto">
    ...
  </div>
</div>
```

### `src/components/finance/manual-payments/CreateManualPaymentDrawer.tsx:407`

الحالي يستخدم `w-[calc(100vw-16px)]` و`max-h-[calc(100dvh-16px)]`، وهو مناسب. يجب فقط اختبار لوحة المفاتيح الافتراضية وعدم اختفاء أزرار أسفل النموذج:

```tsx
<div className="flex min-h-0 max-h-[calc(100dvh-16px)] flex-col">
  <div className="min-h-0 flex-1 overflow-y-auto">
    ...
  </div>
  <div className="shrink-0 border-t bg-white p-4">الأزرار</div>
</div>
```

### `src/pages/super-admin/crud/shared/Modal.tsx`

المقترح:

```tsx
<div className="relative flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl flex-col overflow-hidden rounded-3xl sm:max-h-[92vh]">
  <header className="shrink-0">...</header>
  <div className="min-h-0 flex-1 overflow-y-auto">...</div>
</div>
```

---

# 7. صفحات تبدو سليمة مبدئيًا

لا تظهر في الفحص الثابت مؤشرات قوية لمشكلة على الهاتف في الصفحات التالية، مع بقاء الحاجة إلى اختبار بصري عند إضافة تغييرات جديدة:

- `src/pages/Dashboard.tsx` — شبكات KPI تبدأ بعمودين.
- `src/pages/AdminDashboard.tsx` — شبكات KPI تبدأ بعمودين.
- `src/pages/TeacherDashboard.tsx` — شبكات KPI تبدأ بعمودين.
- `src/pages/hr/HrDashboardPage.tsx` — مؤشرات تبدأ بعمودين.
- `src/pages/finance/FinanceFinancialRequestsPage.tsx` — شبكات تبدأ بعمود واحد أو عمودين.
- `src/pages/super-admin/SuperAdminOverviewPage.tsx` — الشبكات تبدأ بعمودين، والجداول داخل `overflow-x-auto`.
- `src/pages/lms/student/StudentMyCoursesPage.tsx` — البطاقات تبدأ بعمود واحد.
- `src/pages/lms/student/StudentAvailableCoursesPage.tsx` — البطاقات تبدأ بعمود واحد.
- `src/pages/lms/student/StudentCertificatesPage.tsx` — البطاقات تبدأ بعمود واحد.
- `src/pages/operations/admin/OpsTasksListPage.tsx` — البطاقات تبدأ بعمود واحد.
- `src/pages/operations/admin/OpsTasksMyPage.tsx` — البطاقات تبدأ بعمود واحد.
- `src/pages/operations/admin/OpsTasksOverduePage.tsx` — البطاقات تبدأ بعمود واحد.
- `src/pages/platform/admin/AdminKnowledgeCategoriesPage.tsx` — البطاقات تبدأ بعمود واحد.
- `src/pages/super-admin/crud/ProgramsConsolePage.tsx` — البطاقات تبدأ بعمود واحد، لكن شريط الفلاتر يحتاج تحققًا.

---

# 8. خطة تنفيذ مقترحة

## المرحلة الأولى: إصلاحات منخفضة المخاطر

1. تحويل كل `grid-cols-3` المباشر في الأقسام المذكورة إلى `grid-cols-1` أو `grid-cols-2` على الهاتف.
2. إضافة `w-full min-w-0` إلى حقول الفلاتر التي تحتوي `min-w`.
3. إضافة `flex-col sm:flex-row sm:flex-wrap` لأشرطة الفلاتر.
4. توحيد حاويات الجداول على `w-full min-w-0 overflow-x-auto`.

## المرحلة الثانية: التحقق من التجربة

1. تشغيل صفحات الأدوار على `375x812`.
2. إعادة الاختبار على `320x667`، لأن بعض المشاكل لا تظهر على 375px.
3. اختبار الاتجاهين RTL وLTR حيث توجد أرقام أو جداول مالية.
4. اختبار التمرير الأفقي داخل الجداول والكانبان فقط.
5. التأكد من عدم وجود تمدد أفقي في `document.documentElement.scrollWidth`.

كود Playwright مقترح لفحص التمدد:

```ts
const overflow = await page.evaluate(() => ({
  viewport: document.documentElement.clientWidth,
  document: document.documentElement.scrollWidth,
  body: document.body.scrollWidth,
}))

expect(overflow.document).toBeLessThanOrEqual(overflow.viewport + 1)
expect(overflow.body).toBeLessThanOrEqual(overflow.viewport + 1)
```

## المرحلة الثالثة: بدائل الجداول

1. إبقاء الجداول العريضة على سطح المكتب.
2. توفير بطاقات أو صفوف مختصرة للهواتف في:
   - المدفوعات اليدوية.
   - التقارير الأسبوعية.
   - أي جدول مخفي تحت `md` أو `sm` بدون بديل واضح.
3. عدم إخفاء معلومات وظيفية مهمة دون توفير بديل.

---

# 9. ترتيب الأولوية النهائي

| الأولوية | الصفحات/المكونات | الإجراء |
|---|---|---|
| P0 | `DashboardLayout.tsx` | تم إصلاح شريط الهاتف ومنع التمدد العام |
| P1 | Quality وFinance وMembers وStudent Orders وLMS Structure | إصلاح الشبكات الثلاثية |
| P1 | صفحات الفلاتر المذكورة في القسم 3.2 | إزالة `min-w` من الهاتف وجعل الحقول عمودية |
| P1 | `TransactionsTable` و`ManualPaymentsTable` و`WeeklyReportsPage` | التأكد من وجود بدائل الهاتف عند إخفاء الجدول |
| P2 | جداول HR وSuper Admin وOperations | مراجعة التمرير الداخلي ومؤشر التمرير |
| P2 | Operations Board وKanban components | اختبار التمرير الداخلي وعدم تمدد الصفحة |
| P2 | Modals وDrawers | اختبار الارتفاع الصغير ولوحة المفاتيح |
| P3 | الصفحات التي تبدأ شبكاتها بعمود واحد | مراقبة انحدار الاستجابة مستقبلًا |

---

## الخلاصة

الإصلاح الذي تم في `DashboardLayout.tsx` عالج المشكلة العامة الأكثر وضوحًا في شريط لوحة التحكم على الهاتف. أما بقية الملاحظات فهي موزعة داخل الصفحات الفرعية: بعضها يحتاج تعديلًا مباشرًا، وبعضها يعمل كما هو لكن يجب إثباته بصريًا.

أعلى عائد متوقع يأتي من تنفيذ المرحلة الأولى على صفحات **Quality، Finance، Members، Student Orders، LMS Admin، Operations، وSuper Admin**، ثم إضافة فحص آلي يمنع أي صفحة من توسيع `scrollWidth` خارج عرض الهاتف.

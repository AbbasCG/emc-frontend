# 📐 دليل الاصطلاحات والمعايير — EMC Frontend

> مرجع موحّد لأسلوب الكود وتنظيم المشروع. كل مساهمة يجب أن تلتزم به.
> _آخر تحديث: 2026-06-21 (نسخة أولية — تُحدَّث مع نضج المشروع)._

## 1. البنية المقترحة لمجلد `src/`
بما أن المشروع ما زال هيكلاً أولياً، نقترح اعتماد البنية التالية مع بدء التطوير:

```
src/
├── assets/            # صور وأيقونات وخطوط
├── components/        # مكوّنات واجهة قابلة لإعادة الاستخدام (PascalCase)
│   ├── ui/            # عناصر أساسية (Button, Input, Card...)
│   └── layout/        # Header, Footer, Sidebar...
├── pages/ (أو routes/) # صفحات مرتبطة بالمسارات
├── features/          # وحدات وظيفية مكتملة (اختياري للتنظيم حسب الميزة)
├── hooks/             # React hooks مخصّصة (useXxx)
├── lib/               # أدوات مساعدة (api client, helpers, constants)
├── api/               # طبقة الاتصال بالخادم (axios instances + endpoints)
├── types/             # تعريفات TypeScript المشتركة
├── store/             # إدارة الحالة (إن وُجدت)
├── i18n/              # ملفات الترجمة (عربي/إنجليزي)
└── styles/            # أنماط عامة
```

## 2. تسمية الملفات والرموز
| العنصر | الاصطلاح | مثال |
|--------|----------|------|
| ملف مكوّن React | `PascalCase.tsx` | `UserCard.tsx` |
| Hook | `useCamelCase.ts` | `useAuth.ts` |
| أداة/مساعد | `camelCase.ts` | `formatDate.ts` |
| ثوابت | `UPPER_SNAKE_CASE` | `API_BASE_URL` |
| نوع/واجهة TS | `PascalCase` | `interface User` |
| مجلد | `kebab-case` أو `camelCase` | `user-profile/` |

## 3. أسلوب الكود
- **TypeScript صارم:** يجب تفعيل `"strict": true` في `tsconfig` (غير مفعّل حالياً — انظر التقييم).
- **مكوّنات دالّية فقط** (Function Components) مع Hooks. لا Class Components.
- تجنّب `any`؛ استخدم أنواعاً صريحة أو `unknown` ثم التضييق.
- استورد الأيقونات من `lucide-react` (موجود في التبعيات).
- الحركات عبر `framer-motion` (موجود في التبعيات).

## 4. التنسيق (Formatting)
- يُوصى بإضافة **Prettier** (غير موجود حالياً) + `.editorconfig`.
- مسافة بادئة: 2 spaces. علامات اقتباس مفردة. فاصلة منقوطة: حسب ما يُقرّ في Prettier.

## 5. التعريب وRTL
- لغة الواجهة الأساسية: **العربية** مع `dir="rtl"`.
- يجب أن يكون `<html lang="ar" dir="rtl">` (مُصلَح لاحقاً — حالياً `lang="en"`).
- الخط الأساسي: **Tajawal**. ألوان الهوية: `--customBlue #2691C2`, `--customOrange #ec943c`, `--deepBlue #22334a`.
- عند إضافة الإنجليزية لاحقاً: استخدم طبقة i18n موحّدة، لا نصوصاً مكتوبة مباشرة (hard-coded).

## 6. اصطلاح رسائل Git (Conventional Commits)
```
<type>(<scope>): <subject بالعربية أو الإنجليزية>

الأنواع: feat | fix | docs | style | refactor | perf | test | chore | ci
مثال: feat(auth): إضافة صفحة تسجيل الدخول
```
- فرع لكل ميزة: `feature/<name>` · إصلاح: `fix/<name>`.
- لا يُدفع مباشرة على `main`؛ عبر Pull Request.

## 7. قبل كل Commit (Checklist)
- [ ] `npm run lint` نظيف.
- [ ] `npm run build` ينجح.
- [ ] تحديث [CHANGELOG](../03-changes/CHANGELOG.md) عند تغيير ملموس.
- [ ] لا أسرار (secrets) أو مفاتيح في الكود — استخدم `.env` (غير متعقّب في Git).

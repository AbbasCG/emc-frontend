# 🪝 أنماط الـEffects القانونية — مرجع M4.a

> **الغرض:** توحيد كيفية إصلاح مخالفات `react-hooks/set-state-in-effect` (245 موقعاً / 184 ملفاً) تمهيداً لإعادة القاعدة إلى `error`.
> **قاعدة حاكمة:** الإصلاح يجب أن يكون **حقيقياً لا تحايلاً على القاعدة**. أي نمط يُسكت اللينت دون تغيير السلوك فعلياً = ممنوع (خطة §2.4).

## لماذا القاعدة موجودة
`setState` **متزامناً** داخل جسم effect يسبّب دورة render إضافية بعد الـcommit (cascading render): React يرسم إطاراً بالحالة القديمة ثم يعيد الرسم فوراً. القاعدة (eslint-plugin-react-hooks 7.x) لا تشتكي حين تكون الحالة تُضبط:
- بعد `await` (أي في microtask لاحق)، أو
- داخل callback اشتراك (`addEventListener`, `.then`)، أو
- أثناء الـrender نفسه (نمط «تعديل الحالة عند تغيّر prop» الموثّق في react.dev).

## النمط P1 — الجلب (fetch on mount / on deps)
**المخالف:**
```tsx
async function load() {
  setLoadError(null)   // ← متزامن داخل مسار الـeffect
  setLoading(true)     // ← متزامن
  try { setItems(await fetchX()) } catch { setLoadError('...') } finally { setLoading(false) }
}
useEffect(() => { void load() }, [])
```
**القانوني:** انقل كل `setState` إلى ما **بعد** أول `await`، واجعل الحالة الابتدائية صحيحة أصلاً (`useState(true)` للتحميل). زر «إعادة المحاولة» يبقى handler عادياً — الضبط المتزامن فيه مسموح لأنه ليس effect.
```tsx
const [loading, setLoading] = useState(true)   // ابتدائياً محمِّل — لا حاجة لضبطه في الـeffect

useEffect(() => {
  const controller = new AbortController()
  void (async () => {
    try {
      const rows = await fetchX(controller.signal)
      if (controller.signal.aborted) return
      setItems(rows)
      setLoadError(null)
    } catch {
      if (controller.signal.aborted) return
      setLoadError('تعذّر التحميل…')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  })()
  return () => controller.abort()
}, [])

// إعادة المحاولة من زر = خارج effect ⇒ الضبط المتزامن مسموح ومطلوب
const retry = useCallback(async () => { setLoading(true); setLoadError(null); /* …نفس الجسم… */ }, [])
```
**الأفضل حين يطابق الشكل:** استخدم `useFetch` من `@/hooks/useFetch` بدل اليدوي (يتكفّل بالإجهاض وتجاهل النتائج القديمة).

## النمط P2 — إعادة الضبط عند تغيّر prop/dep
**المخالف:**
```tsx
useEffect(() => { setPage(0) }, [courses, itemsPerPage])
```
**القانوني — «تعديل الحالة أثناء الـrender»** (react.dev: *You Might Not Need an Effect → Adjusting state when a prop changes*). React يعيد الـrender فوراً قبل أي رسم، فلا إطار قديم ولا cascading render:
```tsx
const [seen, setSeen] = useState({ courses, itemsPerPage })
if (seen.courses !== courses || seen.itemsPerPage !== itemsPerPage) {
  setSeen({ courses, itemsPerPage })
  setPage(0)
}
```
**الأبسط حين يمكن:** احذف الحالة كلياً واشتقّها أثناء الـrender (مثلاً `Math.min(page, totalPages - 1)`).

## النمط P3 — الاشتراكات والمؤقّتات
مسموح كما هو — الضبط داخل callback لا يُخالف:
```tsx
useEffect(() => {
  const onResize = () => setWidth(window.innerWidth)
  window.addEventListener('resize', onResize)
  return () => window.removeEventListener('resize', onResize)
}, [])
```

## ⛔ ممنوع (تحايل يُسكت اللينت بلا تغيير سلوك)
- `useEffect(() => { void (async () => { await load() })() }, [])` — تغليف بـIIFE حول دالة تضبط الحالة متزامناً: يمرّ من اللينت لأن التحليل لا يعبر الحدّ، لكنه **لا يغيّر السلوك إطلاقاً**.
- `Promise.resolve().then(load)` لنفس الغرض.
- `// eslint-disable` أو تعديل إعدادات اللينت.

## ملاحظة عن الـrefs
`react-hooks/refs` (error) يمنع قراءة `ref.current` أثناء الـrender — استخدم حالة `seen` (P2) لا ref.

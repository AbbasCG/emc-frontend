import { ServerCrash } from 'lucide-react'
import ErrorPageShell from '@/components/errors/ErrorPageShell'

export default function ServerErrorPage() {
  return (
    <ErrorPageShell
      code="500"
      title="حدث خطأ في الخادم"
      description="نواجه مشكلة تقنية مؤقتة. يمكنك إعادة المحاولة قريبًا أو التواصل مع الدعم إذا استمرّ الأمر."
      icon={<ServerCrash size={52} strokeWidth={1.75} className="text-rose-400" aria-hidden />}
      actions={
        <>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="emc-focus-ring inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-xl bg-customBlue px-7 py-3 font-bold text-white shadow-emc-sm transition-all duration-300 ease-emc-out hover:-translate-y-0.5 hover:bg-[#1e7dab] hover:shadow-emc"
          >
            إعادة المحاولة
          </button>
          <a
            href="/contact"
            className="emc-focus-ring inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-xl border border-deepBlue/10 bg-white px-7 py-3 font-bold text-deepBlue shadow-emc-xs transition-all duration-300 ease-emc-out hover:-translate-y-0.5 hover:border-customBlue/40 hover:bg-sky-50"
          >
            تواصل معنا
          </a>
        </>
      }
    />
  )
}

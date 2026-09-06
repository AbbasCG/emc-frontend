import type { ReactNode } from 'react'
import { Link } from 'react-router'

type Props = {
  code: string
  title: string
  description: string
  icon: ReactNode
  actions?: ReactNode
}

export default function ErrorPageShell({ code, title, description, icon, actions }: Props) {
  return (
    <section
      role="region"
      aria-labelledby="error-shell-title"
      dir="rtl"
      className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#F6F8FB] px-4 py-16"
    >
      <div className="w-full max-w-lg text-center">
        <div
          className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-200/80 ring-1 ring-slate-100"
          aria-hidden
        >
          {icon}
        </div>
        <p className="text-7xl font-black leading-none tracking-tight text-deepBlue/15 select-none" aria-hidden>
          {code}
        </p>
        <h1 id="error-shell-title" className="-mt-3 text-3xl font-black text-deepBlue sm:text-4xl">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-md leading-8 text-slate-500">{description}</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {actions ?? (
            <>
              <Link
                to="/"
                className="emc-focus-ring inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-xl bg-customBlue px-7 py-3 font-bold text-white shadow-md shadow-sky-200 transition hover:bg-[#1e7dab]"
              >
                الرئيسية
              </Link>
              <Link
                to="/contact"
                className="emc-focus-ring inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-xl border border-slate-200 bg-white px-7 py-3 font-bold text-deepBlue transition hover:border-customBlue/40 hover:bg-sky-50"
              >
                تواصل معنا
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

import { Link } from 'react-router'
import { motion } from 'framer-motion'

type BreadcrumbItem = {
  label: string
  href?: string
}

type PageHeaderProps = {
  title: string
  subtitle?: string
  breadcrumbs: BreadcrumbItem[]
}

export default function PageHeader({ title, subtitle, breadcrumbs }: PageHeaderProps) {
  return (
    <motion.section
      className="relative isolate overflow-hidden bg-deepBlue px-4 py-20 text-white sm:px-6 lg:px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_30%,rgba(0,119,182,0.38),transparent_32%),linear-gradient(135deg,#0C2A4B_0%,#172536_70%,#0f1c2b_100%)]" />
      <div className="relative mx-auto max-w-7xl text-center">
        <div className="mb-5 flex items-center justify-center gap-2 text-sm font-bold text-sky-100">
          {breadcrumbs.map((item, index) => (
            <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
              {index > 0 && <span className="text-customOrange">&gt;</span>}
              {item.href ? (
                <Link to={item.href} className="transition hover:text-white">
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
            </span>
          ))}
        </div>
        <h1 className="text-4xl font-black sm:text-5xl lg:text-6xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-5 max-w-2xl text-lg leading-9 text-slate-200">{subtitle}</p>}
      </div>
    </motion.section>
  )
}

import { NavLink, useLocation } from 'react-router-dom'
import { financeSectionBase } from '@/utils/financeNav'

export default function FinanceSubnav() {
  const { pathname } = useLocation()
  const base = financeSectionBase(pathname)
  const links = [
    { to: base,                       label: 'لوحة المالية', end: true },
    { to: `${base}/payments`,         label: 'المدفوعات' },
    { to: `${base}/orders`,           label: 'الطلبات' },
    { to: `${base}/invoices`,         label: 'الفواتير' },
    { to: `${base}/transactions`,     label: 'المعاملات' },
  ]

  return (
    <nav className="flex flex-wrap justify-end gap-2 rounded-2xl bg-deepBlue/[0.04] p-2 ring-1 ring-deepBlue/[0.06]">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) =>
            [
              'rounded-xl px-4 py-2 text-xs font-black transition',
              isActive ? 'bg-deepBlue text-white shadow-md' : 'bg-white text-deepBlue ring-1 ring-deepBlue/[0.08]',
            ].join(' ')
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  )
}

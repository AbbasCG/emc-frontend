import { NavLink } from 'react-router-dom'

const tabCls =
  'rounded-xl px-4 py-2 text-xs font-black transition border border-transparent'
const activeCls = 'bg-deepBlue text-white shadow-md border-deepBlue'
const idleCls = 'bg-white text-deepBlue ring-1 ring-deepBlue/[0.08] hover:border-customBlue/25'

export default function OpsTaskTabs() {
  return (
    <nav className="flex flex-wrap justify-end gap-2 rounded-2xl bg-deepBlue/[0.04] p-2 ring-1 ring-deepBlue/[0.06]" aria-label="عروض المهام">
      <NavLink to="/dashboard/admin/tasks" end className={({ isActive }) => `${tabCls} ${isActive ? activeCls : idleCls}`}>
        قائمة
      </NavLink>
      <NavLink to="/dashboard/admin/tasks/kanban" className={({ isActive }) => `${tabCls} ${isActive ? activeCls : idleCls}`}>
        كانبان
      </NavLink>
      <NavLink to="/dashboard/admin/tasks/my" className={({ isActive }) => `${tabCls} ${isActive ? activeCls : idleCls}`}>
        مهامي
      </NavLink>
      <NavLink to="/dashboard/admin/tasks/overdue" className={({ isActive }) => `${tabCls} ${isActive ? activeCls : idleCls}`}>
        المتأخرة
      </NavLink>
    </nav>
  )
}

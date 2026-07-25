import { memo } from 'react'
import type { AdminManagedUser } from '@/api/adminUsersApi'
import { UserAvatarCell } from '@/components/super-admin/users/UserAvatarCell'
import {
  UserRoleBadge,
  UserStatusBadge,
  UserVerifiedBadge,
} from '@/components/super-admin/users/UserBadges'
import { isDeletedUser } from '@/components/super-admin/users/userBadgeStatus'
import { EmptyPanel } from '@/pages/super-admin/crud/shared/States'
import { CrudCardTable, CrudTable, Td, Th, Tr } from '@/pages/super-admin/crud/shared/TableChrome'
import { RowActionsMenu, type MenuAction } from '@/pages/super-admin/crud/shared/RowActions'
import { formatDate, formatLastLogin } from '@/utils/dateTime'

type Props = {
  users: AdminManagedUser[]
  getRowActions: (user: AdminManagedUser) => MenuAction[]
  onRowClick: (user: AdminManagedUser) => void
}

function UsersDataTableInner({ users, getRowActions, onRowClick }: Props) {
  return (
    <CrudCardTable className="min-w-[1020px] rounded-none border-0 shadow-none">
      <CrudTable>
        <thead>
          <tr>
            <Th className="min-w-[15rem] bg-gradient-to-b from-slate-50 to-slate-50/90">المستخدم</Th>
            <Th className="w-14">#</Th>
            <Th className="w-28">الجوال</Th>
            <Th className="w-32">الدور</Th>
            <Th className="w-28">الإدارة</Th>
            <Th className="w-24">الحساب</Th>
            <Th className="w-28">توثيق البريد</Th>
            <Th className="w-36">آخر دخول</Th>
            <Th className="w-32">تاريخ الإنشاء</Th>
            <Th className="w-20 text-end">إجراءات</Th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <Td colSpan={10} className="p-0">
                <EmptyPanel
                  title="لا توجد نتائج مطابقة"
                  subtitle="جرّب تعديل البحث أو المرشّحات — النتائج تُحمَّل من الخادم عند توفر الترقيم."
                />
              </Td>
            </tr>
          ) : (
            users.map((u) => (
              <Tr
                key={u.id}
                muted={isDeletedUser(u)}
                className="cursor-pointer"
                onClick={() => onRowClick(u)}
              >
                <Td>
                  <UserAvatarCell
                    name={u.name}
                    email={u.email}
                    avatarUrl={u.avatar_url}
                    status={isDeletedUser(u) ? 'deleted' : u.is_active === false ? 'inactive' : 'active'}
                  />
                </Td>
                <Td>
                  <span className="font-mono text-[11px] font-black text-slate-500">#{u.id}</span>
                </Td>
                <Td className="text-[12px] text-slate-600">
                  {u.phone?.trim() ? u.phone : <span className="text-slate-300">—</span>}
                </Td>
                <Td>
                  <UserRoleBadge role={u.role} />
                </Td>
                <Td className="max-w-[8rem] truncate text-[12px] text-slate-500">
                  {u.department?.trim() || '—'}
                </Td>
                <Td>
                  <UserStatusBadge user={u} />
                </Td>
                <Td>
                  <UserVerifiedBadge user={u} />
                </Td>
                <Td>
                  <p className="text-[12px] font-semibold text-[#0C2A4B]">{formatLastLogin(u.last_login_at)}</p>
                </Td>
                <Td>
                  <p className="text-[12px] text-slate-500">{formatDate(u.created_at)}</p>
                </Td>
                <Td className="text-end" onClick={(e) => e.stopPropagation()}>
                  <RowActionsMenu ariaLabel={`إجراءات ${u.name}`} actions={getRowActions(u)} />
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </CrudTable>
    </CrudCardTable>
  )
}

export const UsersDataTable = memo(UsersDataTableInner)

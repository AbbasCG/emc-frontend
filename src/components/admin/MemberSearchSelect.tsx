import { useMemo, useRef } from 'react';
import AsyncSelect from 'react-select/async';
import type { SingleValue, StylesConfig } from 'react-select';
import { searchMembersWithAccount } from '@/api/membersApi';

/**
 * Searchable EXISTING-MEMBER picker for the department-membership assignment
 * form — hits the same canonical directory /dashboard/members uses
 * (team_profiles via /admin/members), scoped to profiles that already have a
 * linked user account. This deliberately does NOT search the raw `users`
 * table: the business rule is that department/unit assignment starts from an
 * existing EMC member, never an arbitrary account.
 *
 * Selecting an option carries the member's canonical department/title along
 * with it, so the caller can auto-populate those fields read-only instead of
 * asking the admin to re-enter data that already exists on the member's
 * profile. The option's `value` is the member's linked `user_id` (never the
 * team_profiles.id) — that's the id team_members.user_id actually needs.
 */

export type SelectedMember = {
  userId: number;
  name: string;
  departmentId: number | null;
  departmentName: string | null;
  roleTitle: string | null;
};

type MemberOption = {
  value: number;
  label: string;
  departmentId: number | null;
  departmentName: string | null;
  roleTitle: string | null;
};

const BLUE_500 = 'rgb(59, 130, 246)';
const SLATE_300 = 'rgb(203, 213, 225)';
const SLATE_400 = 'rgb(148, 163, 184)';

const styles: StylesConfig<MemberOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: '42px',
    borderRadius: '0.75rem',
    borderColor: state.isFocused ? BLUE_500 : SLATE_300,
    boxShadow: state.isFocused ? `0 0 0 2px ${BLUE_500}` : 'none',
    textAlign: 'right' as const,
    direction: 'rtl' as const,
    cursor: 'pointer',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    border: `1px solid ${SLATE_300}`,
    textAlign: 'right' as const,
    direction: 'rtl' as const,
    zIndex: 60,
  }),
  menuList: (base) => ({ ...base, maxHeight: '240px', overflowY: 'auto' }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    textAlign: 'right' as const,
    backgroundColor: state.isSelected ? BLUE_500 : state.isFocused ? 'rgb(239, 246, 255)' : 'white',
    color: state.isSelected ? 'white' : 'rgb(30, 41, 59)',
    fontSize: '0.875rem',
    cursor: 'pointer',
  }),
  singleValue: (base) => ({ ...base, textAlign: 'right' as const }),
  placeholder: (base) => ({ ...base, color: SLATE_400, textAlign: 'right' as const }),
  input: (base) => ({ ...base, textAlign: 'right' as const }),
  indicatorSeparator: () => ({ display: 'none' }),
};

type Props = {
  value: SelectedMember | null;
  onChange: (member: SelectedMember | null) => void;
  ariaLabel?: string;
  instanceId?: string;
};

export default function MemberSearchSelect({ value, onChange, ariaLabel, instanceId }: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadOptions = useMemo(
    () => (input: string, callback: (options: MemberOption[]) => void) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!input.trim()) {
        callback([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        const hits = await searchMembersWithAccount(input.trim());
        callback(
          hits
            .filter((m) => m.user_id != null)
            .map((m) => ({
              value: m.user_id as number,
              label: m.name,
              departmentId: m.department_id ? Number(m.department_id) : null,
              departmentName: m.department ?? null,
              roleTitle: m.role_label ?? null,
            })),
        );
      }, 350);
    },
    [],
  );

  const selected: MemberOption | null = value
    ? { value: value.userId, label: value.name, departmentId: value.departmentId, departmentName: value.departmentName, roleTitle: value.roleTitle }
    : null;

  return (
    <div dir="rtl">
      <AsyncSelect<MemberOption, false>
        instanceId={instanceId}
        value={selected}
        loadOptions={loadOptions}
        onChange={(opt: SingleValue<MemberOption>) =>
          onChange(
            opt
              ? {
                  userId: opt.value,
                  name: opt.label,
                  departmentId: opt.departmentId,
                  departmentName: opt.departmentName,
                  roleTitle: opt.roleTitle,
                }
              : null,
          )
        }
        isClearable
        placeholder="-- ابحث ضمن أعضاء EMC الحاليين --"
        formatOptionLabel={(opt: MemberOption) => (
          <span>
            {opt.label}
            {opt.departmentName ? <span className="mr-1 text-slate-400"> · {opt.departmentName}</span> : null}
          </span>
        )}
        noOptionsMessage={({ inputValue }) =>
          inputValue ? 'لا يوجد أعضاء مطابقون (تأكد من ارتباط العضو بحساب مستخدم)' : 'اكتب للبحث عن عضو'
        }
        loadingMessage={() => 'جارٍ البحث...'}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        aria-label={ariaLabel}
        styles={styles}
      />
    </div>
  );
}

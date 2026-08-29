import { useMemo, useRef } from 'react';
import AsyncSelect from 'react-select/async';
import type { SingleValue, StylesConfig } from 'react-select';
import { searchAdminUsers, type UserSearchHit } from '@/api/adminUsersApi';

/**
 * Searchable existing-user picker for admin membership forms — hits the
 * canonical /admin/users/search endpoint (already used elsewhere for the
 * course-enrollment "find existing student" flow) rather than loading a
 * full user list client-side. Debounced manually since react-select/async's
 * loadOptions fires on every keystroke otherwise.
 */

type UserOption = { value: number; label: string; email: string };

const BLUE_500 = 'rgb(59, 130, 246)';
const SLATE_300 = 'rgb(203, 213, 225)';
const SLATE_400 = 'rgb(148, 163, 184)';

const styles: StylesConfig<UserOption, false> = {
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

function toOption(u: UserSearchHit): UserOption {
  return { value: u.id, label: u.name, email: u.email };
}

type Props = {
  value: { id: number; name: string } | null;
  onChange: (user: { id: number; name: string } | null) => void;
  ariaLabel?: string;
  instanceId?: string;
};

export default function UserSearchSelect({ value, onChange, ariaLabel, instanceId }: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadOptions = useMemo(
    () => (input: string, callback: (options: UserOption[]) => void) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!input.trim()) {
        callback([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        try {
          const hits = await searchAdminUsers(input.trim());
          callback(hits.map(toOption));
        } catch {
          callback([]);
        }
      }, 350);
    },
    [],
  );

  const selected: UserOption | null = value ? { value: value.id, label: value.name, email: '' } : null;

  return (
    <div dir="rtl">
      <AsyncSelect<UserOption, false>
        instanceId={instanceId}
        value={selected}
        loadOptions={loadOptions}
        onChange={(opt: SingleValue<UserOption>) => onChange(opt ? { id: opt.value, name: opt.label } : null)}
        isClearable
        placeholder="-- ابحث بالاسم أو البريد الإلكتروني --"
        noOptionsMessage={({ inputValue }) => (inputValue ? 'لا يوجد مستخدمون مطابقون' : 'اكتب للبحث عن مستخدم')}
        loadingMessage={() => 'جارٍ البحث...'}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        aria-label={ariaLabel}
        styles={styles}
      />
    </div>
  );
}

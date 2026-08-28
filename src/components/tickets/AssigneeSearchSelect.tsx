import Select, { type SingleValue, type StylesConfig } from 'react-select';
import type { TicketUser } from '@/types/ticket';

type UserOption = { value: string; label: string };

/**
 * Searchable single-select for the ticket "assigned employee" field.
 *
 * Reuses `react-select` (already an app dependency — see
 * src/components/forms/SearchableSelect.tsx) rather than introducing a new
 * combobox library. Styling here intentionally mirrors the plain
 * slate/blue look already used by every other <select> in
 * TechAdminDashboardPage's modals (border-slate-300, rounded-xl,
 * focus:ring-blue-500, text-sm, py-2.5) rather than the deepBlue/customBlue
 * token set used by SearchableSelect/CountrySelect elsewhere in the app —
 * those belong to a different visual language than this dashboard.
 *
 * Data contract is unchanged: the option `value` is always the user's
 * numeric id (as a string), never the name — callers keep sending
 * `assigned_to_id` exactly as before.
 */
const BLUE_500 = 'rgb(59, 130, 246)';
const SLATE_300 = 'rgb(203, 213, 225)';
const SLATE_400 = 'rgb(148, 163, 184)';
const ROSE_300 = 'rgb(253, 164, 175)';

function buildStyles(hasError: boolean): StylesConfig<UserOption, false> {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: '42px',
      borderRadius: '0.75rem',
      borderColor: hasError ? ROSE_300 : state.isFocused ? BLUE_500 : SLATE_300,
      borderWidth: '1px',
      backgroundColor: 'white',
      boxShadow: state.isFocused ? `0 0 0 2px ${BLUE_500}` : 'none',
      textAlign: 'right' as const,
      direction: 'rtl' as const,
      cursor: 'pointer',
      transition: 'border-color 150ms, box-shadow 150ms',
      '&:hover': { borderColor: state.isFocused ? BLUE_500 : SLATE_300 },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '2px 12px',
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.75rem',
      overflow: 'hidden',
      border: `1px solid ${SLATE_300}`,
      boxShadow: '0 12px 28px -8px rgba(15, 23, 42, 0.18), 0 2px 6px -1px rgba(15, 23, 42, 0.06)',
      textAlign: 'right' as const,
      direction: 'rtl' as const,
      zIndex: 60,
    }),
    menuList: (base) => ({
      ...base,
      maxHeight: '240px',
      overflowY: 'auto',
      paddingTop: 4,
      paddingBottom: 4,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    option: (base, state) => ({
      ...base,
      textAlign: 'right' as const,
      backgroundColor: state.isSelected ? BLUE_500 : state.isFocused ? 'rgb(239, 246, 255)' : 'white',
      color: state.isSelected ? 'white' : 'rgb(30, 41, 59)',
      fontWeight: state.isSelected ? 700 : 500,
      fontSize: '0.875rem',
      padding: '8px 12px',
      cursor: 'pointer',
    }),
    singleValue: (base) => ({
      ...base,
      color: 'rgb(30, 41, 59)',
      fontWeight: 500,
      textAlign: 'right' as const,
    }),
    placeholder: (base) => ({
      ...base,
      color: SLATE_400,
      fontWeight: 400,
      textAlign: 'right' as const,
    }),
    input: (base) => ({
      ...base,
      color: 'rgb(30, 41, 59)',
      textAlign: 'right' as const,
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base) => ({
      ...base,
      color: SLATE_400,
      padding: '0 8px',
    }),
    clearIndicator: (base) => ({
      ...base,
      color: SLATE_400,
      padding: '0 4px',
    }),
  };
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  users: TicketUser[];
  placeholder?: string;
  ariaLabel?: string;
  instanceId?: string;
  hasError?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  noOptionsMessage?: string;
};

export default function AssigneeSearchSelect({
  value,
  onChange,
  users,
  placeholder,
  ariaLabel,
  instanceId,
  hasError = false,
  isDisabled = false,
  isLoading = false,
  noOptionsMessage,
}: Props) {
  // Backend meta() intentionally omits email (least-privilege — only
  // id/name/role are ever selected for the assignable-users list), so the
  // label is name-only rather than risking a literal "(undefined)" suffix.
  const options: UserOption[] = users.map((u) => ({
    value: String(u.id),
    label: u.name,
  }));
  const selected = value ? options.find((o) => o.value === value) ?? null : null;

  return (
    <div dir="rtl">
      <Select<UserOption, false>
        instanceId={instanceId}
        options={options}
        value={selected}
        onChange={(opt: SingleValue<UserOption>) => onChange(opt ? opt.value : '')}
        isSearchable
        isClearable
        isDisabled={isDisabled}
        isLoading={isLoading}
        placeholder={placeholder ?? '-- اختر المكلف --'}
        noOptionsMessage={() => noOptionsMessage ?? 'لا يوجد موظف مطابق للبحث'}
        // Default filterOption already does a trim + case-insensitive substring
        // match, which works correctly for Arabic (no case concept — plain
        // substring), English (lower-cased), and mixed-language strings alike.
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        aria-label={ariaLabel}
        styles={buildStyles(hasError)}
      />
    </div>
  );
}

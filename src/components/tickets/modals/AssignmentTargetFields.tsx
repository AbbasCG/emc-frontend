import type { AssignmentTargets } from '@/hooks/useAssignmentTargets';
import AssigneeSearchSelect from '@/components/tickets/AssigneeSearchSelect';

export const NO_UNITS_NOTE = 'لا توجد وحدات تقنية في هذه الإدارة';
export const NO_DEPARTMENT_MEMBERS = 'لا يوجد أعضاء مؤهلون للإسناد في هذه الإدارة';
export const NO_UNIT_MEMBERS = 'لا يوجد موظفون مرتبطون بهذه الوحدة';

interface Props {
  formId: string;
  targets: AssignmentTargets;
  unitLabel: string;
  assigneeLabel: string;
  assigneeInstanceId: string;
  disabled?: boolean;
  disabledUserIds?: number[];
  disabledHint?: string;
  /** Server (422) messages for the two fields, already in Arabic. */
  errors?: { unit_id?: string; assigned_to_id?: string };
  onUnitChange?: () => void;
  onAssigneeChange?: () => void;
}

/**
 * The «unit + assignee» part of the approve / reassign forms, driven by useAssignmentTargets.
 *
 * - loading: a status line (the fields are not offered yet);
 * - error: an Arabic alert with a retry button (never mistaken for «no units»);
 * - a department without units: no unit field, a short note, the department's members at once;
 * - a department with units: the unit is required and the members of the chosen unit are loaded.
 */
export function AssignmentTargetFields({
  formId,
  targets,
  unitLabel,
  assigneeLabel,
  assigneeInstanceId,
  disabled = false,
  disabledUserIds,
  disabledHint,
  errors = {},
  onUnitChange,
  onAssigneeChange,
}: Props) {
  const { phase, hasUnits, units, unitId, users, usersLoading, usersError, assigneeId } = targets;
  const ready = phase === 'ready';
  const needsUnitFirst = ready && hasUnits && !unitId;
  const emptyMembers = ready && !usersLoading && !usersError && !needsUnitFirst && users.length === 0;
  const unitError = errors.unit_id;
  const assigneeError = errors.assigned_to_id;

  return (
    <>
      {phase === 'loading' ? (
        <p role="status" data-testid="assignment-loading" className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
          جارٍ تحميل الوحدات والأعضاء المتاحين للإسناد...
        </p>
      ) : null}

      {phase === 'error' ? (
        <div role="alert" data-testid="assignment-load-error" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-3">
          <p className="text-xs font-bold text-red-700">تعذر تحميل الوحدات والأعضاء المتاحين للإسناد.</p>
          <button
            type="button"
            onClick={targets.retry}
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      {ready && hasUnits ? (
        <div>
          <label htmlFor={`${formId}-unit`} className="block text-xs font-bold text-slate-700 mb-1.5">
            {unitLabel} <span className="text-rose-500">*</span>
          </label>
          <select
            id={`${formId}-unit`}
            value={unitId}
            disabled={disabled}
            aria-invalid={unitError ? true : undefined}
            onChange={(e) => {
              targets.setUnit(e.target.value);
              onUnitChange?.();
            }}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
          >
            <option value="">-- اختر الوحدة التقنية --</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name_ar}</option>
            ))}
          </select>
          {unitError ? <p className="mt-1 text-[11px] font-bold text-rose-600">{unitError}</p> : null}
        </div>
      ) : null}

      {ready && !hasUnits ? (
        <p data-testid="assignment-no-units" className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
          {NO_UNITS_NOTE}
        </p>
      ) : null}

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          {assigneeLabel} <span className="text-rose-500">*</span>
        </label>
        <AssigneeSearchSelect
          instanceId={assigneeInstanceId}
          ariaLabel={assigneeLabel}
          users={users}
          value={assigneeId}
          onChange={(v) => {
            targets.setAssignee(v);
            onAssigneeChange?.();
          }}
          hasError={Boolean(assigneeError)}
          disabledUserIds={disabledUserIds}
          disabledHint={disabledHint}
          isDisabled={disabled || !ready || needsUnitFirst || usersLoading || usersError}
          isLoading={phase === 'loading' || usersLoading}
          placeholder={needsUnitFirst ? 'اختر الوحدة التقنية أولاً' : '-- ابحث عن المكلف بالاسم --'}
          noOptionsMessage={hasUnits ? NO_UNIT_MEMBERS : NO_DEPARTMENT_MEMBERS}
        />
        {assigneeError ? <p className="mt-1 text-[11px] font-bold text-rose-600">{assigneeError}</p> : null}
        {usersError ? (
          <div role="alert" data-testid="assignment-users-error" className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-3">
            <p className="text-xs font-bold text-red-700">تعذر تحميل أعضاء هذه الوحدة.</p>
            <button
              type="button"
              onClick={targets.retryUsers}
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : null}
        {emptyMembers ? (
          <p data-testid="assignment-no-members" className="mt-1 text-[11px] font-bold text-amber-600">
            {hasUnits ? NO_UNIT_MEMBERS : NO_DEPARTMENT_MEMBERS}
          </p>
        ) : null}
      </div>
    </>
  );
}

import { useId } from 'react';
import { Rocket } from 'lucide-react';
import { DEPLOYMENT_FLAG_LOCKED_MESSAGE, DEPLOYMENT_FROZEN_MESSAGE } from '@/lib/ticketLifecycle';

export const REQUIRES_DEPLOYMENT_HELP = 'تمر التذكرة بمراجعة ثم نشر ثم اختبار المكلّف على الموقع الحي قبل الإغلاق.';
/**
 * «تتطلب نشرًا على الموقع الحي»: a ticket that goes through review, deployment and the assignee's live test before it
 * closes. Shown only in the manager forms (approve, reassign, edit estimate). `frozen` (the server's
 * `can_edit_estimate` is false) disables it and says why; the server refuses the change then too.
 */
export function RequiresDeploymentSwitch({
  checked,
  onChange,
  disabled = false,
  frozen = false,
  frozenMessage,
  locked = false,
  error,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  frozen?: boolean;
  /** Why it is frozen (stage, or the manager is the assignee); defaults to the stage wording. */
  frozenMessage?: string;
  /** The ticket was already submitted for review: it stays on, it cannot be switched off. */
  locked?: boolean;
  /** The server's refusal (409 DEPLOYMENT_FLAG_LOCKED), shown right under the switch. */
  error?: string | null;
}) {
  const lockedOn = locked && checked;
  const id = useId();

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3" data-testid="requires-deployment">
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-xs font-bold text-slate-800">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled || frozen || lockedOn}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={`${id}-help`}
          className="h-4 w-4 rounded text-customBlue disabled:opacity-50"
        />
        <Rocket className="h-4 w-4 text-teal-600" aria-hidden="true" />
        تتطلب نشرًا على الموقع الحي
      </label>
      <p id={`${id}-help`} className="mt-1.5 pr-6 text-[11px] font-semibold leading-relaxed text-slate-500">
        {REQUIRES_DEPLOYMENT_HELP}
      </p>
      {frozen ? (
        <p role="note" className="mt-1.5 pr-6 text-[11px] font-bold text-amber-700" data-testid="requires-deployment-frozen">
          {frozenMessage ?? DEPLOYMENT_FROZEN_MESSAGE}
        </p>
      ) : lockedOn ? (
        <p role="note" className="mt-1.5 pr-6 text-[11px] font-bold text-amber-700" data-testid="requires-deployment-locked">
          {DEPLOYMENT_FLAG_LOCKED_MESSAGE}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1.5 pr-6 text-[11px] font-bold text-rose-600" data-testid="requires-deployment-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default RequiresDeploymentSwitch;

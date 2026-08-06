import type { ApiTokenScope } from '@/types/phase7'
import { ALL_API_TOKEN_SCOPES, API_TOKEN_SCOPE_LABELS_AR } from '@/components/enterprise/apiTokenScopes'
import { cn } from '@/lib/utils'

export default function ScopeSelector({
  value,
  onChange,
  disabled,
}: {
  value: ApiTokenScope[]
  onChange: (next: ApiTokenScope[]) => void
  disabled?: boolean
}) {
  function toggle(scope: ApiTokenScope) {
    if (disabled) return
    if (value.includes(scope)) onChange(value.filter((s) => s !== scope))
    else onChange([...value, scope])
  }

  return (
    <div dir="rtl" className="grid gap-2 sm:grid-cols-2">
      {ALL_API_TOKEN_SCOPES.map((scope) => {
        const on = value.includes(scope)
        return (
          <button
            key={scope}
            type="button"
            disabled={disabled}
            onClick={() => toggle(scope)}
            className={cn(
              'flex items-center justify-between rounded-xl px-3 py-3 text-right text-xs font-black ring-1 ring-inset transition',
              on ? 'bg-deepBlue text-white ring-deepBlue shadow-md' : 'bg-white text-slate-600 ring-slate-200 hover:border-customBlue/30',
            )}
          >
            <span>{API_TOKEN_SCOPE_LABELS_AR[scope]}</span>
            <span className="font-mono text-[10px] opacity-80" dir="ltr">
              {scope}
            </span>
          </button>
        )
      })}
    </div>
  )
}

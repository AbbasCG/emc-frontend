import { useEffect, useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { hubPanelDomId, hubTabDomId, type UsersHubTabDef, type UsersHubTabId } from './usersHubTabs'

interface Props {
  tabs: readonly UsersHubTabDef[]
  active: UsersHubTabId
  onSelect: (id: UsersHubTabId) => void
}

/**
 * شريط التبويبات (ARIA Tabs، تفعيل يدوي).
 *
 * - الأسهم تحرّك التركيز فقط، والتفعيل بـ Enter/Space/النقر: لا يُغرِق سجلّ المتصفح بإدخال لكل سهم.
 * - RTL: السهم الأيسر = التالي، والأيمن = السابق (عكس LTR). Home/End للأول والأخير.
 * - تبويب واحد في ترتيب Tab (roving tabindex).
 * - على الجوال يمرَّر أفقيًا ولا يلتف.
 */
export function UsersHubTabBar({ tabs, active, onSelect }: Props) {
  const refs = useRef(new Map<UsersHubTabId, HTMLButtonElement>())

  // on a phone the bar scrolls sideways: keep the selected tab in view (also after back/forward)
  useEffect(() => {
    refs.current.get(active)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [active])

  const focusAt = (index: number) => {
    const next = tabs[(index + tabs.length) % tabs.length]
    refs.current.get(next.id)?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        focusAt(index + 1)
        break
      case 'ArrowRight':
        event.preventDefault()
        focusAt(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusAt(0)
        break
      case 'End':
        event.preventDefault()
        focusAt(tabs.length - 1)
        break
      default:
    }
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div
        role="tablist"
        aria-label="أقسام مركز المستخدمين"
        aria-orientation="horizontal"
        className="inline-flex min-w-max gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) refs.current.set(tab.id, el)
                else refs.current.delete(tab.id)
              }}
              type="button"
              role="tab"
              id={hubTabDomId(tab.id)}
              aria-selected={selected}
              aria-controls={hubPanelDomId(tab.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(tab.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                'inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue focus-visible:ring-offset-2',
                selected ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-navy',
              )}
            >
              <tab.Icon className="h-4 w-4" aria-hidden="true" />
              {tab.labelAr}
            </button>
          )
        })}
      </div>
    </div>
  )
}

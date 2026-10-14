import { useState } from 'react'
import { Bookmark, Check, Trash2 } from 'lucide-react'
import type { TicketFilters } from '@/types/ticketOps'
import { useSavedTicketViews } from '@/hooks/useSavedTicketViews'
import { DEFAULT_FILTERS, TICKET_PRESETS, filtersFromSaved, savedQueryOf, withFilters } from '@/utils/ticketFilters'
import { cn } from '@/lib/utils'

/**
 * Views menu: the presets, this person's saved filter sets (kept in this browser), and "save the
 * current filters". A view replaces ALL current filters, like opening a link would.
 */
export function TicketSavedViews({ userId, filters, onApply }: { userId: number | string | null | undefined; filters: TicketFilters; onApply: (f: TicketFilters) => void }) {
  const { views, add, remove, isFull, max } = useSavedTicketViews(userId)
  const [open, setOpen] = useState(false)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')

  const current = savedQueryOf(filters)
  const hasFilters = current !== ''
  const apply = (f: TicketFilters) => {
    onApply(f)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="true" className={cn('inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12px] font-black transition', open ? 'border-customBlue bg-customBlue/[0.06] text-customBlue' : 'border-deepBlue/10 text-deepBlue hover:border-customBlue/40')}>
        <Bookmark size={14} aria-hidden="true" /> العروض
      </button>

      {open ?
        <div role="menu" aria-label="العروض المحفوظة" className="absolute end-0 z-30 mt-2 w-72 space-y-3 rounded-2xl border border-deepBlue/10 bg-white p-3 shadow-xl">
          <div>
            <p className="mb-1.5 px-1 text-[11px] font-black text-deepBlue/45">عروض جاهزة</p>
            <ul className="space-y-0.5">
              {TICKET_PRESETS.map((p) => (
                <li key={p.id}>
                  <button type="button" role="menuitem" onClick={() => apply(withFilters(DEFAULT_FILTERS, p.patch))} className="w-full rounded-lg px-2.5 py-2 text-start text-[13px] font-bold text-deepBlue hover:bg-customBlue/[0.06]">{p.label}</button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-1.5 px-1 text-[11px] font-black text-deepBlue/45">عروضي ({views.length}/{max})</p>
            {views.length === 0 ?
              <p className="px-2 text-[12px] font-semibold text-deepBlue/45">لا توجد عروض محفوظة بعد.</p>
            : <ul className="space-y-0.5">
                {views.map((v) => (
                  <li key={v.id} className="flex items-center gap-1">
                    <button type="button" role="menuitem" onClick={() => apply(filtersFromSaved(v))} className="min-w-0 flex-1 truncate rounded-lg px-2.5 py-2 text-start text-[13px] font-bold text-deepBlue hover:bg-customBlue/[0.06]">{v.name}</button>
                    <button type="button" onClick={() => remove(v.id)} aria-label={`حذف العرض ${v.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-deepBlue/40 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} aria-hidden="true" /></button>
                  </li>
                ))}
              </ul>}
          </div>

          {naming ?
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault()
                if (add(name, current)) { setName(''); setNaming(false) }
              }}
            >
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus placeholder="اسم العرض" aria-label="اسم العرض" className="min-w-0 flex-1 rounded-lg border border-deepBlue/10 px-2.5 py-2 text-[13px] font-semibold outline-none focus:border-customBlue" />
              <button type="submit" disabled={!name.trim()} aria-label="حفظ العرض" className="grid h-9 w-9 place-items-center rounded-lg bg-customBlue text-white disabled:opacity-40"><Check size={15} aria-hidden="true" /></button>
            </form>
          : <button type="button" disabled={!hasFilters || isFull} onClick={() => setNaming(true)} className="w-full rounded-xl border border-dashed border-customBlue/40 px-3 py-2 text-[12px] font-black text-customBlue hover:bg-customBlue/[0.05] disabled:cursor-not-allowed disabled:opacity-45">
              {isFull ? 'اكتمل عدد العروض' : hasFilters ? 'حفظ الفلاتر الحالية كعرض' : 'اختر فلاتر أولًا لحفظها'}
            </button>}
          <p className="px-1 text-[11px] font-semibold leading-relaxed text-deepBlue/40">تُحفظ الفلاتر على هذا المتصفح فقط، ولا تغيّر ما يُسمح لك برؤيته.</p>
        </div>
      : null}
    </div>
  )
}

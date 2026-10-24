import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Lightbulb, Sparkles } from "lucide-react";
import type { TicketInsight } from "@/types/ticketOps";
import { cn } from "@/lib/utils";
import { SEVERITY_META, ageText } from "./ticketOpsUi";

/** How many insights show before "show more": enough to act on, few enough that the table stays in view. */
const INITIAL = 3;

const MEMORY_KEY = "emc.ticketInsights.open";

/** Collapsed unless this browser session already expanded it; storage may be unavailable, which just means "collapsed". */
function remembered(): boolean {
  try {
    return window.sessionStorage.getItem(MEMORY_KEY) === "1";
  } catch {
    return false;
  }
}

function remember(open: boolean) {
  try {
    window.sessionStorage.setItem(MEMORY_KEY, open ? "1" : "0");
  } catch {
    /* private mode / blocked storage: the panel simply starts collapsed next time */
  }
}

/**
 * Tickets that need a look, from the platform's own operational rules (the Smart Rules thresholds
 * for "unassigned too long" and "overdue", plus a declined assignment, an unowned urgent ticket and
 * a silent one). Each says why, since when, and what to do next. Reading only: nothing here assigns,
 * closes, notifies or changes a ticket.
 */
export function TicketInsightsPanel({
  insights,
  loading,
  onOpen,
}: {
  insights: TicketInsight[] | null;
  loading: boolean;
  onOpen: (id: number) => void;
}) {
  const [open, setOpen] = useState(remembered);
  const [all, setAll] = useState(false);
  const reduce = useReducedMotion();
  const bodyId = useId();
  const count = insights?.length ?? 0;
  const urgent =
    insights?.filter((i) => i.severity === "critical" || i.severity === "high")
      .length ?? 0;
  const toggle = () =>
    setOpen((v) => {
      remember(!v);

      return !v;
    });
  if (insights !== null && count === 0 && !loading) return null;

  return (
    <section
      aria-label="تنبيهات ذكية"
      className="rounded-2xl border border-violet-200 bg-violet-50/40"
      data-testid="insights-panel"
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <span className="inline-flex min-w-0 flex-wrap items-center gap-2 text-sm font-black text-violet-900">
          <Sparkles size={16} aria-hidden="true" /> تنبيهات ذكية
          <span
            className="rounded-full bg-violet-600 px-2 py-0.5 text-[11px] text-white"
            data-testid="insights-count"
          >
            {insights === null ? "…" : count}
          </span>
          {!open && urgent > 0 ? (
            <span className="text-[11px] font-bold text-rose-700">
              {urgent} تحتاج انتباهًا عاجلًا
            </span>
          ) : null}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-black text-violet-800">
          {open ? "إخفاء" : "عرض"}
          <ChevronDown
            size={16}
            className={cn("transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={bodyId}
            key="body"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-2.5 px-4 pb-4 pt-1">
              {insights === null ? (
                <div className="space-y-2" aria-busy="true">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-2xl bg-white/70"
                    />
                  ))}
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {insights.slice(0, all ? 8 : INITIAL).map((i) => {
                    const sev = SEVERITY_META[i.severity] ?? SEVERITY_META.info;

                    return (
                      <li
                        key={i.ticketId}
                        className="flex gap-3 rounded-2xl border border-white bg-white p-3 shadow-sm"
                        data-testid="insight-item"
                        data-severity={i.severity}
                      >
                        <span
                          className={cn(
                            "mt-1 h-10 w-1 shrink-0 rounded-full",
                            sev.bar,
                          )}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ring-inset",
                                sev.badge,
                              )}
                            >
                              {i.severityLabel}
                            </span>
                            <span className="text-[13px] font-black text-deepBlue">
                              {i.title}
                            </span>
                            {i.since ? (
                              <span className="text-[11px] font-semibold text-deepBlue/45">
                                {ageText(i.since)}
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpen(i.ticketId)}
                            className="mt-0.5 block max-w-full truncate text-start text-[12px] font-black text-customBlue hover:underline"
                            aria-label={`فتح التذكرة ${i.ticketNumber}`}
                          >
                            {i.ticketNumber} · {i.ticketTitle}
                          </button>
                          <p className="mt-1 text-[12px] font-semibold text-deepBlue/70">
                            {i.reason}
                          </p>
                          <p className="mt-1 inline-flex items-start gap-1.5 text-[12px] font-semibold text-deepBlue/60">
                            <Lightbulb
                              size={12}
                              className="mt-0.5 shrink-0 text-customOrange"
                              aria-hidden="true"
                            />{" "}
                            {i.suggestedAction}
                          </p>
                          {i.suggestedPriority ? (
                            <p className="mt-1 text-[11px] font-bold text-violet-800">
                              اقتراح: رفع الأولوية إلى «
                              {i.suggestedPriority.label}» —{" "}
                              {i.suggestedPriority.reason}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {count > INITIAL ? (
                <button
                  type="button"
                  onClick={() => setAll((v) => !v)}
                  aria-expanded={all}
                  className="rounded-lg px-2 py-1 text-[12px] font-black text-violet-800 hover:bg-violet-100"
                >
                  {all
                    ? "عرض أقل"
                    : `عرض المزيد (${Math.min(count, 8) - INITIAL})`}
                </button>
              ) : null}
              {all && count > 8 ? (
                <p className="text-[11px] font-bold text-violet-900/70">
                  وتنبيهات أخرى ({count - 8}) أقل أولوية، تظهر في الجدول بحسب
                  الفلاتر.
                </p>
              ) : null}
              <p className="text-[11px] font-semibold text-violet-900/60">
                تُحسب من حدود قواعد التشغيل الذكية نفسها. اقتراحات للمراجعة فقط،
                ولا يتغير شيء تلقائيًا.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

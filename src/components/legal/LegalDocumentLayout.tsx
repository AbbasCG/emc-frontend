import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  BookOpen,
  ChevronLeft,
  Mail,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import { PublicPageHero } from '@/components/public'
import type { LegalBlock, LegalDocument } from '@/data/legal/types'
import { LEGAL_CONTACT } from '@/data/legal/types'
import { cn } from '@/lib/utils'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/motion'

type Props = {
  doc: LegalDocument
}

export default function LegalDocumentLayout({ doc }: Props) {
  const [activeId, setActiveId] = useState(doc.sections[0]?.id ?? '')

  const toc = useMemo(
    () => doc.sections.map((s) => ({ id: s.id, title: s.title })),
    [doc.sections],
  )

  useEffect(() => {
    const ids = doc.sections.map((s) => s.id)
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target?.id) setActiveId(visible.target.id)
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.25, 0.5] },
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [doc.sections])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveId(id)
  }

  return (
    <main className="bg-[#f4f7fb]">
      <PublicPageHero
        eyebrow={doc.eyebrow}
        badge={doc.badge}
        title={doc.title}
        subtitle={doc.subtitle}
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'القانونية', href: '/privacy' },
          { label: doc.title },
        ]}
        stats={[
          { value: doc.lastUpdated, label: 'آخر تحديث' },
          { value: 'AVG', label: 'امتثال أوروبي' },
          { value: 'NL', label: 'مقر هولندا' },
        ]}
        variant="split"
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* Content column first in DOM for RTL reading order on mobile; grid places TOC on start (right) on lg */}
          <motion.div
            className="min-w-0 space-y-6 lg:order-1"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <TrustStrip />

            {doc.sections.map((section) => (
              <motion.section
                key={section.id}
                id={section.id}
                variants={staggerItem}
                className="scroll-mt-32 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_40px_-20px_rgba(12,42,75,0.12)] ring-1 ring-slate-100 sm:p-8"
              >
                <h2 className="flex items-start gap-3 text-right text-xl font-black text-[#0C2A4B] sm:text-2xl">
                  <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0077B6]/10 text-[#0077B6]">
                    <BookOpen className="h-4 w-4" aria-hidden />
                  </span>
                  {section.title}
                </h2>
                <div className="mt-6 space-y-4 text-right">
                  {section.blocks.map((block, i) => (
                    <BlockRenderer key={`${section.id}-${i}`} block={block} />
                  ))}
                </div>
              </motion.section>
            ))}

            <ContactCard email={doc.contactEmail ?? LEGAL_CONTACT.general} />
          </motion.div>

          {/* Sticky TOC */}
          <aside className="hidden lg:order-2 lg:block">
            <nav
              aria-label="جدول المحتويات"
              className="sticky top-28 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-lg ring-1 ring-slate-100"
            >
              <p className="mb-4 flex items-center gap-2 text-[10px] font-black tracking-[0.16em] text-[#F28C00] uppercase">
                <Scale className="h-3.5 w-3.5" aria-hidden />
                جدول المحتويات
              </p>
              <ul className="max-h-[calc(100vh-10rem)] space-y-1 overflow-y-auto text-right">
                {toc.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => scrollTo(item.id)}
                      className={cn(
                        'w-full rounded-xl px-3 py-2.5 text-right text-[12px] font-bold leading-relaxed transition',
                        activeId === item.id
                          ? 'bg-[#0C2A4B] text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-[#0C2A4B]',
                      )}
                    >
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-1.5 text-[12px] font-black text-[#0077B6] hover:underline"
                >
                  تواصل معنا
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </nav>
          </aside>
        </div>

        {/* Mobile TOC */}
        <div className="mt-8 lg:hidden">
          <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-sm font-black text-[#0C2A4B]">جدول المحتويات</summary>
            <ul className="mt-3 space-y-1 text-right">
              {toc.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => scrollTo(item.id)}
                    className="w-full rounded-lg px-2 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </main>
  )
}

function TrustStrip() {
  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#0077B6]/20 bg-gradient-to-l from-[#0C2A4B] to-[#1a2940] px-5 py-4 text-white shadow-lg"
    >
      <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
      <p className="text-[13px] font-semibold leading-relaxed text-white/85">
        وثائق EMC القانونية معدّة للشفافية قبل الإطلاق الإنتاجي راجع{' '}
        <Link to="/privacy" className="font-black text-[#F28C00] hover:underline">الخصوصية</Link>
        {' '}و{' '}
        <Link to="/cookies" className="font-black text-[#0077B6] hover:underline">ملفات تعريف الارتباط</Link>.
      </p>
    </motion.div>
  )
}

function BlockRenderer({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case 'p':
      return <p className="text-[15px] font-medium leading-8 text-slate-700">{block.text}</p>
    case 'ul':
      return (
        <ul className="list-none space-y-2 ps-0">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[14px] font-medium leading-8 text-slate-700">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F28C00]" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol className="list-decimal space-y-2 ps-6 marker:font-black marker:text-[#0077B6]">
          {block.items.map((item, i) => (
            <li key={i} className="text-[14px] font-medium leading-8 text-slate-700">
              {item}
            </li>
          ))}
        </ol>
      )
    case 'callout':
      return (
        <div
          className={cn(
            'rounded-2xl border px-5 py-4 text-right',
            block.variant === 'warning' && 'border-amber-200 bg-amber-50/90 text-amber-950',
            block.variant === 'trust' && 'border-emerald-200/80 bg-emerald-50/80 text-emerald-950',
            (!block.variant || block.variant === 'info') && 'border-[#0077B6]/25 bg-[#0077B6]/6 text-[#1a4a66]',
          )}
        >
          {block.title ?
            <p className="mb-1 text-[13px] font-black">{block.title}</p>
          : null}
          <p className="text-[13px] font-semibold leading-7">{block.text}</p>
        </div>
      )
    case 'placeholder':
      return (
        <p className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/50 px-4 py-3 text-[12px] font-bold text-amber-900">
          {block.label}
        </p>
      )
    default:
      return null
  }
}

function ContactCard({ email }: { email: string }) {
  return (
    <motion.section
      variants={fadeUp}
      className="rounded-3xl bg-gradient-to-bl from-[#0C2A4B] via-[#1c3550] to-[#162334] p-8 text-right text-white shadow-xl"
    >
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10">
          <Mail className="h-5 w-5 text-[#F28C00]" aria-hidden />
        </span>
        <div>
          <h3 className="text-lg font-black">أسئلة قانونية أو خصوصية؟</h3>
          <p className="mt-2 text-sm font-medium leading-7 text-white/70">
            للاستفسارات المتعلقة بهذه الوثيقة أو حقوقك بموجب AVG/GDPR:
          </p>
          <a
            href={`mailto:${email}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#F28C00] px-5 py-2.5 text-sm font-black text-white transition hover:brightness-105"
          >
            {email}
          </a>
          <p className="mt-4 text-[11px] text-white/45">
            الدعم الفني:{' '}
            <a href={`mailto:${LEGAL_CONTACT.support}`} className="font-bold text-[#0077B6] hover:underline">
              {LEGAL_CONTACT.support}
            </a>
          </p>
        </div>
      </div>
    </motion.section>
  )
}

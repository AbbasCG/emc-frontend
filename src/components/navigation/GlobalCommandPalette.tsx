import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search,
  X,
  BookOpen,
  Compass,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { fetchCoursesFromApi } from '@/api/coursesApi.public'
import type { Course } from '@/types'
import { THEMES_BENTO_DATA } from '@/data/themesBentoData'

interface PaletteItem {
  id: string
  title: string
  subtitle: string
  category: 'courses' | 'themes' | 'pages' | 'actions'
  href: string
  isExternal?: boolean
  badge?: string
}

const STATIC_PLATFORM_ITEMS: PaletteItem[] = [
  // Themes
  ...THEMES_BENTO_DATA.map((t) => ({
    id: `theme-${t.id}`,
    title: t.title,
    subtitle: t.desc,
    category: 'themes' as const,
    href: t.link,
    badge: `محور #${t.num}`,
  })),

  // Core Pages
  {
    id: 'page-courses',
    title: 'جميع الدورات والورش المتاحة',
    subtitle: 'استكشف الجدول التدريبي والبرامج النشطة للتسجيل الفوري',
    category: 'pages',
    href: '/courses',
    badge: 'الكتالوج',
  },
  {
    id: 'page-tracks',
    title: 'المسارات الأكاديمية والمهنية',
    subtitle: 'خارطة المسارات الشاملة ونظام الدبلومات المتخصصة',
    category: 'pages',
    href: '/tracks',
    badge: 'المسارات',
  },
  {
    id: 'page-path-finder',
    title: 'محدد المسار التفاعلي الذكي',
    subtitle: 'أجب عن 3 أسئلة سريعة لاكتشاف البرنامج الأنسب لك',
    category: 'actions',
    href: '/#path-finder',
    badge: 'تفاعلي',
  },
  {
    id: 'page-dashboard',
    title: 'بوابة المتعلّم ومساحة الإنجاز',
    subtitle: 'الدخول إلى حسابك، متابعة الدروس، الواجبات، والشهادات',
    category: 'pages',
    href: '/dashboard',
    badge: 'حسابي',
  },
  {
    id: 'page-trainer-apply',
    title: 'انضم كمدرب في المركز',
    subtitle: 'استمارة تقديم المدربين والخبراء الأكاديميين',
    category: 'actions',
    href: '/trainer-apply',
    badge: 'فرص',
  },
  {
    id: 'page-fellowship',
    title: 'زمالة مركز EMC المهنية',
    subtitle: 'برنامج الزمالة المتخصص لإعداد قادة التطوير',
    category: 'pages',
    href: '/fellowship',
    badge: 'برامج خاصة',
  },
  {
    id: 'page-partnerships',
    title: 'الشراكات المؤسسية والتحالفات',
    subtitle: 'التعاون مع الجامعات والشركات والجهات الدولية',
    category: 'pages',
    href: '/partnerships',
    badge: 'شراكات',
  },
  {
    id: 'page-contact',
    title: 'مركز الدعم والتواصل المباشر',
    subtitle: 'فريق الاستشارات والمساعدة عبر واتساب والبريد',
    category: 'pages',
    href: '/contact',
    badge: 'مساعدة',
  },
]

interface Props {
  open?: boolean
  onClose?: () => void
  onOpen?: () => void
}

export default function GlobalCommandPalette({ open: controlledOpen, onClose: controlledClose }: Props = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const setIsOpen = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof val === 'function' ? val(isOpen) : val
      if (!isControlled) {
        setInternalOpen(next)
      }
      if (!next && controlledClose) {
        controlledClose()
      }
    },
    [isOpen, isControlled, controlledClose],
  )

  const [query, setQuery] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  // A freshly opened palette starts empty. Adjusted during render (React's documented pattern for state that follows a prop)
  // rather than in an effect, which would render the stale query once first.
  const [wasOpen, setWasOpen] = useState(isOpen)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
    }
  }

  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)

  // Fetch courses once for search index
  useEffect(() => {
    let active = true
    fetchCoursesFromApi()
      .then((data) => {
        if (active) setCourses(data)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Listen for Ctrl+K / Cmd+K and custom event
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        setIsOpen(false)
      }
    }

    function handleCustomOpen() {
      setIsOpen(true)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('open-command-palette', handleCustomOpen)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('open-command-palette', handleCustomOpen)
    }
  }, [isOpen])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Combine courses into index
  const allItems = useMemo<PaletteItem[]>(() => {
    const courseItems: PaletteItem[] = courses.map((c) => ({
      id: `course-${c.id}`,
      title: c.title,
      subtitle: c.target_audience || c.description || 'برنامج تدريبي في المنظومة',
      category: 'courses',
      href: `/courses/${c.slug}`,
      badge: c.training_hours ? `${c.training_hours} ساعة` : 'دورة',
    }))

    return [...courseItems, ...STATIC_PLATFORM_ITEMS]
  }, [courses])

  // Filter items based on query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      // Default view: curated mix of top actions and courses
      return allItems.slice(0, 10)
    }

    return allItems
      .filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(q)
        const subMatch = item.subtitle.toLowerCase().includes(q)
        const badgeMatch = item.badge?.toLowerCase().includes(q)
        return titleMatch || subMatch || badgeMatch
      })
      .slice(0, 16)
  }, [allItems, query])

  // Handle keyboard navigation
  const handleItemSelect = useCallback(
    (item: PaletteItem) => {
      setIsOpen(false)
      if (item.isExternal) {
        window.open(item.href, '_blank', 'noreferrer')
      } else {
        navigate(item.href)
      }
    },
    [navigate],
  )

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[selectedIndex]) {
        handleItemSelect(filteredItems[selectedIndex])
      }
    }
  }

  // Auto-scroll to selected element
  useEffect(() => {
    const el = resultsContainerRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          dir="rtl"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-6 md:pt-20 overflow-y-auto"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-navy/60 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl z-10"
          >
            {/* Search Input Bar */}
            <div className="relative flex items-center border-b border-slate-200 px-5 py-4">
              <Search size={20} className="text-customBlue shrink-0 ml-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedIndex(0)
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="ابحث في الدورات، المحاور المعرفية، المسارات، أو الخدمات..."
                className="w-full text-base font-bold text-deepBlue placeholder:text-slate-400 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setSelectedIndex(0)
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:text-deepBlue"
                >
                  <X size={16} />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 mr-2 border border-slate-200">
                ESC للإغلاق
              </kbd>
            </div>

            {/* Results List */}
            <div
              ref={resultsContainerRef}
              className="max-h-[60vh] overflow-y-auto p-3 space-y-1 divide-y divide-slate-100"
            >
              {filteredItems.length > 0 ? (
                filteredItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex
                  return (
                    <div
                      key={item.id}
                      data-index={idx}
                      onClick={() => handleItemSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`group flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'bg-deepBlue text-white shadow-sm'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                            isSelected
                              ? 'bg-white/15 text-customOrange'
                              : 'bg-slate-100 text-deepBlue group-hover:bg-deepBlue/5'
                          }`}
                        >
                          {item.category === 'courses' && <BookOpen size={18} />}
                          {item.category === 'themes' && <Sparkles size={18} />}
                          {item.category === 'pages' && <Compass size={18} />}
                          {item.category === 'actions' && <Zap size={18} />}
                        </div>

                        <div className="min-w-0 flex-1 text-right">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-black truncate ${
                                isSelected ? 'text-white' : 'text-deepBlue'
                              }`}
                            >
                              {item.title}
                            </span>
                            {item.badge && (
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-xs truncate mt-0.5 ${
                              isSelected ? 'text-white/80' : 'text-slate-500'
                            }`}
                          >
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="mr-3 shrink-0 flex items-center">
                        <ArrowRight
                          size={16}
                          className={`transition transform ${
                            isSelected
                              ? 'text-customOrange translate-x-1'
                              : 'text-slate-300 group-hover:text-slate-500'
                          }`}
                        />
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-12 text-center">
                  <Search size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-deepBlue">لم يتم العثور على نتائج تطابق بحثك</p>
                  <p className="text-xs text-slate-400 mt-1">جرّب البحث بكلمات أخرى أو تصفح الأقسام العامة</p>
                </div>
              )}
            </div>

            {/* Bottom Keyboard Hints Bar */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-paper px-5 py-3 text-xs text-slate-500 font-bold">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px]">↑</kbd>
                  <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px]">↓</kbd>
                  <span>للتنقل</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px]">↵</kbd>
                  <span>للاختيار</span>
                </span>
              </div>

              <span className="text-[11px] text-customBlue font-black">
                مركز EMC التعليمي · هولندا
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

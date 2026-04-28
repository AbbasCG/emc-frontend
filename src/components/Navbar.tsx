import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, Menu, UserPlus, X } from 'lucide-react'
import type { NavLinkItem } from '../types'

const navLinks: NavLinkItem[] = [
  { label: 'الرئيسية', href: '/' },
  { label: 'الدورات', href: '/courses' },
  { label: 'الاستشارات التعليمية', href: '#' },
  { label: 'التدريب المهني', href: '#' },
  { label: 'عن EMC', href: '/about' },
  { label: 'المدربون', href: '#' },
  { label: 'تواصل معنا', href: '/contact' },
]

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="EMC الرئيسية">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-deepBlue text-xl font-black text-white">
            EMC
          </span>
          <span className="hidden text-right sm:block">
            <span className="block text-lg font-extrabold text-deepBlue">EMC</span>
            <span className="block text-xs font-medium text-slate-500">المنصة التعليمية العالمية</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) =>
            link.href.startsWith('/') ? (
              <NavLink
                key={link.label}
                to={link.href}
                className={({ isActive }) =>
                  `relative py-2 text-sm font-bold transition-colors hover:text-customBlue ${
                    isActive ? 'text-customBlue' : 'text-deepBlue'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <span className="absolute inset-x-1 -bottom-1 h-0.5 rounded-full bg-customOrange" />
                    )}
                  </>
                )}
              </NavLink>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="relative py-2 text-sm font-bold text-deepBlue transition-colors hover:text-customBlue"
              >
                {link.label}
              </a>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-customOrange px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200"
            >
              <UserPlus size={18} />
              سجل الآن
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-customBlue px-5 py-3 text-sm font-bold text-customBlue"
            >
              <LogIn size={18} />
              تسجيل الدخول
            </Link>
          </motion.div>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 text-deepBlue lg:hidden"
          aria-label="فتح القائمة"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMenuOpen && (
        <motion.div
          className="border-t border-slate-100 bg-white px-4 py-5 lg:hidden"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <nav className="grid gap-3">
            {navLinks.map((link) =>
              link.href.startsWith('/') ? (
                <NavLink
                  key={link.label}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-bold ${
                      isActive ? 'bg-sky-50 text-customBlue' : 'text-deepBlue'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-bold text-deepBlue"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-customOrange px-5 py-3 text-sm font-bold text-white"
            >
              <UserPlus size={18} />
              سجل الآن
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-customBlue px-5 py-3 text-sm font-bold text-customBlue"
            >
              <LogIn size={18} />
              تسجيل الدخول
            </Link>
          </div>
        </motion.div>
      )}
    </header>
  )
}

import { memo } from 'react'
import { NavLink } from 'react-router'
import { Home, Compass, User, MessageCircle, LogIn } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

function MobileBottomNav() {
  const { isAuthenticated } = useAuth()

  const navItems = [
    {
      to: '/',
      label: 'الرئيسية',
      icon: Home,
      end: true,
    },
    {
      to: '/tracks',
      label: 'المسارات',
      icon: Compass,
      end: false,
    },
    {
      to: isAuthenticated ? '/dashboard' : '/login',
      label: isAuthenticated ? 'حسابي' : 'دخول',
      icon: isAuthenticated ? User : LogIn,
      end: false,
    },
    {
      to: '/contact',
      label: 'تواصل',
      icon: MessageCircle,
      end: false,
    },
  ]

  return (
    <nav
      aria-label="شريط التنقل السفلي للهاتف"
      dir="rtl"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="grid grid-cols-4 h-16 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-h-[48px] py-1 px-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-customOrange font-black'
                    : 'text-slate-500 hover:text-deepBlue font-bold'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative flex items-center justify-center">
                    <Icon
                      size={20}
                      className={`transition-transform duration-200 ${
                        isActive ? 'scale-110 text-customOrange' : 'text-slate-500'
                      }`}
                    />
                    {isActive && (
                      <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-customOrange" />
                    )}
                  </div>
                  <span className="text-[11px] leading-tight mt-1">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

export default memo(MobileBottomNav)

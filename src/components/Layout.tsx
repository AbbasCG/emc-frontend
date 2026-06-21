import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import Footer from './Footer'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <motion.div
      className="relative min-h-screen overflow-x-hidden bg-white font-sans text-deepBlue antialiased"
      dir="rtl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* Ambient brand atmosphere — subtle, fixed; sits beneath all content */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-emcBg via-white to-white"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 right-[-12rem] -z-10 h-[34rem] w-[34rem] rounded-full bg-customBlue/[0.07] blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-[-10rem] left-[-12rem] -z-10 h-[28rem] w-[28rem] rounded-full bg-customOrange/[0.06] blur-[110px]"
      />

      <a
        href="#main-content"
        className="sr-only sr-only-focusable emc-focus-ring rounded-lg bg-deepBlue px-4 py-2 text-sm font-black text-white ring-2 ring-customOrange"
      >
        تخطي إلى المحتوى الرئيسي
      </a>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="relative outline-none">
        <Outlet />
      </main>
      <Footer />
    </motion.div>
  )
}

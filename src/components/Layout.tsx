import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import Footer from './Footer'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <motion.div
      className="min-h-screen overflow-hidden bg-white text-deepBlue"
      dir="rtl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.55 }}
    >
      <Navbar />
      <Outlet />
      <Footer />
    </motion.div>
  )
}

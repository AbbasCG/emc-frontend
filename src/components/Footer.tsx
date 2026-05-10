import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import logo from '../assets/logo.png'

const quickLinks = [
  { label: 'الرئيسية', href: '/' },
  { label: 'الدورات', href: '/courses' },
  { label: 'من نحن', href: '/about' },
  { label: 'تواصل معنا', href: '/contact' },
]

const services = [
  'استشارات تعليمية',
  'دورات اللغات',
  'التدريب المهني',
  'دعم الطلاب والمهاجرين',
]

const contactItems = [
  { Icon: Phone, text: '+31 6 00 000 000' },
  { Icon: Mail, text: 'info@emc-edu.com' },
  { Icon: MapPin, text: 'أمستردام، هولندا' },
]

export default function Footer() {
  return (
    <footer className="bg-deepBlue text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 text-right sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.3fr]">
          <div>
            <Link to="/" className="inline-block">
              <img src={logo} alt="EMC" className="h-16 w-auto brightness-0 invert" />
            </Link>
            <p className="mt-5 max-w-xs leading-8 text-slate-400">
              منصة تعليمية رقمية عالمية تقدم استشارات تعليمية ودورات لغات وتدريباً مهنياً وتقنياً.
            </p>
          </div>

          <div>
            <h3 className="mb-5 text-base font-black">روابط سريعة</h3>
            <ul className="grid gap-3 text-slate-400">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="transition hover:text-customOrange">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 text-base font-black">خدماتنا</h3>
            <ul className="grid gap-3 text-slate-400">
              {services.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 text-base font-black">تواصل معنا</h3>
            <ul className="grid gap-4">
              {contactItems.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-slate-400">
                  <Icon size={18} className="shrink-0 text-customOrange" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 border-t border-white/10 pt-8 text-center text-sm text-slate-500 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} EMC. جميع الحقوق محفوظة.</span>
          <Link to="/submit-workshop" className="transition hover:text-customOrange">
            قدّم ورشة عمل
          </Link>
        </div>
      </div>
    </footer>
  )
}

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Link2, Mail } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { fadeUp } from '../utils/course'

const team = [
  {
    name: 'د. سارة فان دايك',
    role: 'المديرة التنفيذية ومؤسسة المنصة',
    bio: 'دكتوراه في التعليم الدولي. أكثر من 15 عاماً في مجال التدريب والاستشارات التعليمية في أوروبا.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    specialty: 'الاستشارات الأكاديمية',
  },
  {
    name: 'أ. أحمد الرشيد',
    role: 'رئيس قسم التدريب المهني',
    bio: 'خبير في تطوير الكفاءات المهنية وإعداد برامج التوظيف لأسواق العمل الأوروبية.',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
    specialty: 'التدريب المهني',
  },
  {
    name: 'أ. نور الهدى منصور',
    role: 'منسقة البرامج اللغوية',
    bio: 'معلمة لغات معتمدة في الإنجليزية والهولندية مع تخصص في تدريس اللغات للمهاجرين والطلاب الدوليين.',
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80',
    specialty: 'تعليم اللغات',
  },
  {
    name: 'م. خالد البستاني',
    role: 'رئيس قسم التقنية والبيانات',
    bio: 'مهندس برمجيات وخبير في الذكاء الاصطناعي وعلم البيانات مع خبرة في تصميم المناهج التقنية.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    specialty: 'المهارات الرقمية',
  },
  {
    name: 'أ. ليلى حسين',
    role: 'مستشارة الطلاب والمهاجرين',
    bio: 'متخصصة في دعم المهاجرين والطلاب الدوليين في رحلتهم من الوصول إلى الاندماج الكامل.',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    specialty: 'دعم الاندماج',
  },
  {
    name: 'أ. محمد عزام',
    role: 'مدرب التطوير الشخصي والقيادة',
    bio: 'مدرب معتمد دولياً في التنمية البشرية والقيادة وبناء المهارات الناعمة للمهنيين الطموحين.',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    specialty: 'التطوير الشخصي',
  },
]

export default function Team() {
  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title="فريقنا"
        subtitle="فريق من الخبراء والمدربين المعتمدين المكرّسين لدعم نجاحك الأكاديمي والمهني."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'الفريق' },
        ]}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((member, index) => (
              <motion.article
                key={member.name}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.07 }}
                className="overflow-hidden rounded-2xl bg-white text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="h-full w-full object-cover transition duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-deepBlue/70 to-transparent" />
                  <span className="absolute bottom-4 right-4 rounded-full bg-customOrange px-3 py-1 text-xs font-black text-white">
                    {member.specialty}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-black text-deepBlue">{member.name}</h3>
                  <p className="mt-1 text-sm font-bold text-customBlue">{member.role}</p>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{member.bio}</p>
                  <div className="mt-5 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition hover:bg-customBlue hover:text-white"
                      aria-label="LinkedIn"
                    >
                      <Linkedin size={16} />
                    </button>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition hover:bg-customBlue hover:text-white"
                      aria-label="البريد الإلكتروني"
                    >
                      <Mail size={16} />
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-2xl bg-gradient-to-l from-deepBlue via-[#1c4567] to-[#162334] p-8 text-right text-white shadow-2xl sm:p-10 lg:flex-row lg:items-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h2 className="text-3xl font-black sm:text-4xl">انضم إلى فريقنا</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-slate-200">
              إذا كنت مدرباً أو مستشاراً متمرساً وتشاركنا شغفنا بالتعليم، تواصل معنا.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }}>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white"
            >
              تواصل معنا
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}

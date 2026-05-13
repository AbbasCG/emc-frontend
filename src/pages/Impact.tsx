import { motion } from 'framer-motion'
import { BookOpen, HeartHandshake, Quote, Sparkles, Target, Users } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { CTASection, PublicPageHero, StatCard } from '@/components/public'
import { fadeUp } from '@/utils/motion'

export default function Impact() {
  return (
    <main className="bg-[#f4f7fb] pt-20">
      <PublicPageHero
        eyebrow="الأثر والنتائج"
        title="الأثر"
        subtitle="نقدّم صورة واقعية لما نعمل عليه: برامج متنوعة، مستفيدون من خلفيات مختلفة، وشراكات قيد البناء — مع أثر تعليمي ومجتمعي متنامٍ."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'الأثر' },
        ]}
      />

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title="مؤشرات بأسلوب حذر" description="نفضّل الصدق على الأرقام البراقة: هذه مؤشرات نوعية تعكس اتجاه عملنا." />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={BookOpen}
              label="برامج وورش متنوعة"
              hint="تغطي مجالات لغوية ومهنية ورقمية ومجتمعية"
              delay={0}
            />
            <StatCard
              icon={Users}
              label="مستفيدون من خلفيات مختلفة"
              hint="طلاب، مهنيون، مهاجرون، وأسر"
              accentClass="text-customOrange"
              delay={0.05}
            />
            <StatCard
              icon={HeartHandshake}
              label="شراكات قيد البناء"
              hint="مع مؤسسات وخبراء ضمن أطر واضحة"
              delay={0.1}
            />
            <StatCard
              icon={Target}
              label="أثر تعليمي متنامٍ"
              hint="عبر التغذية الراجعة والتحسين المستمر"
              accentClass="text-emerald-600"
              delay={0.15}
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            align="right"
            title="البرامج المقدّمة"
            description="نعمل على تقديم دورات وورش ومسارات تعليمية بجودة محكومة بمعايير داخلية ومراجعة دورية."
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-white p-8 text-right shadow-lg ring-1 ring-slate-100 lg:p-10"
          >
            <ul className="grid gap-3 text-sm font-semibold leading-8 text-slate-700 sm:grid-cols-2">
              {[
                'محتوى يجمع بين الأساسيات والتطبيق العملي.',
                'جلسات أونلاين وحضورية حسب طبيعة البرنامج.',
                'متابعة تنظيمية عبر فريق البرامج والتشغيل.',
                'بوابة للتسجيل والوصول إلى الموارد حسب السياسات الحالية.',
              ].map((l) => (
                <li key={l} className="flex gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-customOrange" />
                  {l}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title="المشاركون والدعم" description="نركّز على تجربة آمنة ومحترمة للمتعلم، مع قنوات دعم واضحة." />
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                title: 'تنوع المشاركين',
                body: 'نرحب بخلفيات متعددة ونعمل على تقليل حواجز الدخول عبر شرح مسبق ومتطلبات واضحة.',
              },
              {
                title: 'دعم أثناء البرنامج',
                body: 'قنوات استفسار عبر الفريق التشغيلي والتقني ضمن أوقات محددة معلنة.',
              },
              {
                title: 'خصوصية وسلامة',
                body: 'سياسات خصوصية ومبادئ سلوك تهدف لحماية المشارك داخل بيئة التعلم.',
              },
            ].map((c, i) => (
              <motion.div
                key={c.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className="rounded-3xl bg-white p-7 text-right shadow-md ring-1 ring-slate-100"
              >
                <h3 className="text-lg font-black text-deepBlue">{c.title}</h3>
                <p className="mt-3 leading-8 text-slate-600">{c.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="المجتمع والشراكات"
            description="ننمّي علاقات شراكة تدريجية مع جهات تتقاطع أهدافها مع رسالتنا."
          />
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-deepBlue p-8 text-right text-lg leading-9 text-slate-200 lg:p-10"
          >
            نعمل على بناء شبكة شركاء تعليمية ومهنية عبر اتفاقيات واضحة، مع التزام بالشفافية في
            الأدوار والمخرجات. لا نعلن عن «مئات الشراكات» — بل ننمو بخطوات مؤكدة.
          </motion.p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="قصص نجاح — نماذج توضيحية"
            description="حتى يتوفر نشر رسمي لقصص المشاركين، نضع نماذج أسلوبية تحترم الخصوصية."
          />
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                q: 'مشارك في برنامج لغوي: تحسّنت ثقتي بالمحادثة اليومية خلال أسابيع من التمارين الموجهة.',
                tag: 'برنامج لغوي — مستوى متوسط',
              },
              {
                q: 'مشاركة في ورشة مهارات مهنية: رتّبت أولويات التقديم والمقابلة بخطة أوضح.',
                tag: 'ورشة المسار المهني',
              },
              {
                q: 'مشارك في مقدمة رقمية: فهمت أدوات العمل الأساسية دون مبالغة تقنية.',
                tag: 'تمكين رقمي',
              },
            ].map((s) => (
              <motion.blockquote
                key={s.tag}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45 }}
                className="rounded-3xl bg-white p-7 text-right shadow-md ring-1 ring-slate-100"
              >
                <Quote className="text-customOrange" size={22} />
                <p className="mt-4 leading-8 text-slate-700">«{s.q}»</p>
                <footer className="mt-4 text-xs font-bold text-customBlue">{s.tag}</footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="المخرجات والأهداف المستقبلية"
            description="نطوّر المخرجات عبر تقييم البرامج، ملاحظات المشاركين، وشراكات جديدة بجودة أعلى."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {[
              'تحسين تجربة التسجيل والوصول للموارد التعليمية.',
              'توسيع مجالات البرامج ضمن الاثنا عشر مع الحفاظ على الجودة.',
              'تعزيز مبادرات المجتمع والصحة والوعي بشكل آمن ومهني.',
              'بناء تقارير أثر دورية تشاركها الإدارة العليا والشركاء عند الاقتضاء.',
            ].map((line) => (
              <motion.div
                key={line}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4 }}
                className="rounded-3xl bg-white p-6 text-right text-sm font-semibold leading-8 text-slate-700 shadow-sm ring-1 ring-slate-100"
              >
                {line}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title="كن جزءاً من الأثر"
        description="سجّل في برنامج، أو اقترح شراكة، أو شارك كمتطوع — كل مسار يساهم في بناء مجتمع تعليمي أوضح."
        primaryLabel="البرامج والدورات"
        primaryHref="/courses"
        secondaryLabel="الشراكات"
        secondaryHref="/partnerships"
      />
    </main>
  )
}

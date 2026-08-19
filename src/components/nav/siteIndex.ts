/**
 * Site index data — every public destination, grouped into a small number of
 * MAIN sections whose children unfold on demand. Kept apart from the panel
 * component so Fast Refresh stays clean (react-refresh/only-export-components).
 */

export type IndexLink = { href: string; label: string; description: string }
export type IndexGroup = {
  /** Main section name — this is what the visitor scans first. */
  title: string
  /** One line explaining what the whole section is for. */
  lead: string
  links: readonly IndexLink[]
}

export const SITE_INDEX: readonly IndexGroup[] = [
  {
    title: 'تعلّم',
    lead: 'من أول ورشة مجانية إلى تخصص مهني كامل',
    links: [
      { href: '/learn', label: 'رحلة التعلّم', description: 'خمس محطات واختبار يحدّد نقطة انطلاقك' },
      { href: '/courses', label: 'الدورات', description: 'مهارة محددة في أسابيع، بمشروع تسلّمه' },
      { href: '/learning-paths', label: 'المسارات', description: 'تخصص مهني كامل بملف أعمال' },
      { href: '/workshops', label: 'الورش المجانية', description: 'بث مباشر شهري وشهادة حضور' },
      { href: '/fellowship', label: 'الزمالة', description: 'عمل حقيقي بإشراف خبراء — بالقبول فقط' },
      { href: '/tracks', label: 'المجالات', description: 'اثنا عشر محوراً تغطي منظومة EMC' },
    ],
  },
  {
    title: 'المركز',
    lead: 'من نحن، وكيف نعمل، وما أثرنا',
    links: [
      { href: '/about', label: 'عن المركز', description: 'القصة والرؤية ومن نحن' },
      { href: '/impact', label: 'الأثر', description: 'أرقام معتمدة وتوزيع جغرافي' },
      { href: '/ar/team', label: 'فريق EMC', description: 'القيادة والفرق التنفيذية' },
      { href: '/instructors', label: 'المدرّبون', description: 'من يقف خلف كل برنامج' },
      { href: '/departments', label: 'الأقسام والإدارات', description: 'كيف تُدار المنظومة' },
      { href: '/platform', label: 'المنصة', description: 'نظام التعلّم والأدوات الرقمية' },
    ],
  },
  {
    title: 'انضم إلينا',
    lead: 'شارك بخبرتك أو بمؤسستك أو بوقتك',
    links: [
      { href: '/partnerships', label: 'الشراكات', description: 'تعاون مؤسسي وأكاديمي' },
      { href: '/business', label: 'للمؤسسات', description: 'تدريب مبني على حاجة فريقك' },
      { href: '/volunteer', label: 'التطوع', description: 'شارك بوقتك وخبرتك' },
      { href: '/ambassador', label: 'سفراء EMC', description: 'مثّل المركز في بلدك' },
      { href: '/submit-workshop', label: 'تقديم ورشة', description: 'قدّم ورشتك لجمهور EMC' },
    ],
  },
  {
    title: 'خدمات ودعم',
    lead: 'ما تحتاجه بعد التسجيل، وقبله',
    links: [
      { href: '/verify', label: 'التحقق من الشهادات', description: 'تأكيد صحة أي شهادة برقمها' },
      { href: '/support', label: 'الدعم', description: 'مساعدة في التسجيل والدفع والوصول' },
      { href: '/knowledge', label: 'قاعدة المعرفة', description: 'أدلة وإجابات جاهزة' },
      { href: '/contact', label: 'تواصل معنا', description: 'أسئلة، دعم، أو اقتراح' },
    ],
  },
]

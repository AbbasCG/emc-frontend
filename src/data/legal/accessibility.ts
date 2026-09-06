import type { LegalDocument } from './types'
import { LEGAL_CONTACT } from './types'

export const accessibilityDoc: LegalDocument = {
  slug: 'accessibility',
  route: '/accessibility',
  title: 'بيان إمكانية الوصول',
  subtitle: 'التزام EMC بجعل التعلم الرقمي أكثر شمولاً أهدافنا ومسار التحسين.',
  eyebrow: 'الشمولية · EMC',
  badge: 'Accessibility',
  lastUpdated: '12 يونيو 2026',
  contactEmail: LEGAL_CONTACT.general,
  sections: [
    {
      id: 'commitment',
      title: '1. التزامنا',
      blocks: [
        {
          type: 'p',
          text: 'Educational Mastar Central (EMC) تلتزم بتحسين إمكانية الوصول إلى موقعها ومنصتها التعليمية للمتعلمين ذوي القدرات المتنوعة، وفق أفضل الممارسات ومعايير WCAG 2.1 كمرجع هدف (مستوى AA حيث أمكن).',
        },
      ],
    },
    {
      id: 'keyboard',
      title: '2. التنقل بلوحة المفاتيح',
      blocks: [
        {
          type: 'ul',
          items: [
            'رابط «تخطي إلى المحتوى الرئيسي» في الصفحات العامة',
            'تركيز مرئي (focus ring) على العناصر التفاعلية',
            'هدف: إمكانية إكمال المسارات الأساسية دون فأرة',
          ],
        },
      ],
    },
    {
      id: 'mobile',
      title: '3. الهاتف المحمول',
      blocks: [
        {
          type: 'p',
          text: 'التصميم متجاوب (Responsive) ليتكيف مع أحجام الشاشات. نختبر التخطيط على أجهزة شائعة ونعالج مشاكل القراءة واللمس.',
        },
      ],
    },
    {
      id: 'screenreaders',
      title: '4. قارئات الشاشة',
      blocks: [
        {
          type: 'p',
          text: 'نسعى لاستخدام HTML دلالي، تسميات ARIA حيث يلزم، ونصوص بديلة للصور المهمة. الهدف: توافق أفضل مع NVDA وVoiceOver وTalkBack.',
        },
        {
          type: 'callout',
          variant: 'warning',
          text: 'بعض مكونات LMS التفاعلية (مثل مشغلات الفيديو أو جداول معقدة) قيد التحسين المستمر.',
        },
      ],
    },
    {
      id: 'visual',
      title: '5. البصر والقراءة',
      blocks: [
        {
          type: 'ul',
          items: [
            'تباين ألوان يتماشى مع هوية EMC (#0C2A4B، #0077B6، #F28C00)',
            'أحجام خطوط قابلة للتكبير عبر إعدادات المتصفح',
            'دعم RTL للمحتوى العربي',
          ],
        },
      ],
    },
    {
      id: 'feedback',
      title: '6. ملاحظاتك',
      blocks: [
        {
          type: 'p',
          text: `إن واجهت حاجزاً في إمكانية الوصول، أخبرنا على ${LEGAL_CONTACT.general} مع وصف الصفحة والمتصفح/الجهاز. نرد ونعالج الأولويات بجدية.`,
        },
      ],
    },
    {
      id: 'status',
      title: '7. حالة الامتثال',
      blocks: [
        { type: 'placeholder', label: '[PLACEHOLDER: تاريخ آخر تدقيق إمكانية وصول خارجي إن وُجد]' },
        {
          type: 'p',
          text: 'هذا البيان يُحدَّث عند إنجاز تحسينات جوهرية أو تغييرات تنظيمية.',
        },
      ],
    },
  ],
}

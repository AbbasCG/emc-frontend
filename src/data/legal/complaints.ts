import type { LegalDocument } from './types'
import { LEGAL_CONTACT } from './types'

export const complaintsDoc: LegalDocument = {
  slug: 'complaints',
  route: '/complaints',
  title: 'إجراءات الشكاوى',
  subtitle: 'كيف تقدّم شكوى وتتابع معالجتها — باحترام وشفافية.',
  eyebrow: 'القانونية · EMC',
  badge: 'Complaints',
  lastUpdated: '12 يونيو 2026',
  contactEmail: LEGAL_CONTACT.general,
  sections: [
    {
      id: 'scope',
      title: '1. نطاق الشكاوى',
      blocks: [
        {
          type: 'p',
          text: 'نرحّب بالملاحظات البناءة حول جودة التعليم، خدمة العملاء، الفواتير، إمكانية الوصول، أو معالجة البيانات. الشكاوى الجدية تُعالج بسرية.',
        },
      ],
    },
    {
      id: 'how',
      title: '2. تقديم شكوى',
      blocks: [
        {
          type: 'ol',
          items: [
            'أرسل بريداً إلى ' + LEGAL_CONTACT.general + ' بعنوان «شكوى — [موضوع]»',
            'اذكر اسمك، بريدك، رقم التسجيل إن وُجد، ووصفاً واضحاً للواقعة',
            'أرفق أي مستندات داعمة (فاتورة، لقطات شاشة — دون بيانات حساسة غير ضرورية)',
            'للمشاكل التقنية العاجلة: ' + LEGAL_CONTACT.support + ' (تذكرة دعم)',
          ],
        },
      ],
    },
    {
      id: 'timeline',
      title: '3. المدد الزمنية',
      blocks: [
        {
          type: 'ul',
          items: [
            'إقرار الاستلام: خلال 3 أيام عمل',
            'مراجعة أولية: خلال 10 أيام عمل',
            'قرار أو خطة معالجة: خلال 30 يوماً كحد أقصى للشكاوى غير العاجلة',
          ],
        },
      ],
    },
    {
      id: 'escalation',
      title: '4. التصعيد',
      blocks: [
        {
          type: 'ol',
          items: [
            'المستوى 1: فريق الدعم / علاقات المتعلمين — ' + LEGAL_CONTACT.support,
            'المستوى 2: إدارة الجودة — ' + LEGAL_CONTACT.general,
            'المستوى 3: الإدارة العليا — عند عدم الرضا عن الحل',
            'حقوق GDPR/AVG: شكوى إلى Autoriteit Persoonsgegevens (AP) للمسائل المتعلقة بالخصوصية',
          ],
        },
        {
          type: 'callout',
          variant: 'trust',
          title: 'حل ودّي',
          text: 'نسعى دائماً للحل المباشر معك قبل أي إجراء خارجي. سجّل رقم مرجع الشكوى الذي نرسله لك.',
        },
      ],
    },
    {
      id: 'records',
      title: '5. السجلات',
      blocks: [
        {
          type: 'p',
          text: 'نحتفظ بسجل داخلي للشكاوى والإجراءات المتخذة لتحسين الخدمة والامتثال. البيانات تُعالج وفق سياسة الخصوصية.',
        },
      ],
    },
  ],
}

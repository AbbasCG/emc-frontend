import type { LegalDocument } from './types'
import { LEGAL_CONTACT } from './types'

export const cookiePolicyDoc: LegalDocument = {
  slug: 'cookies',
  route: '/cookies',
  title: 'سياسة ملفات تعريف الارتباط',
  subtitle: 'شرح أنواع ملفات تعريف الارتباط التي تستخدمها EMC وكيف تتحكم بموافقتك.',
  eyebrow: 'القانونية والخصوصية · EMC',
  badge: 'Cookie Policy',
  lastUpdated: '12 يونيو 2026',
  contactEmail: LEGAL_CONTACT.general,
  sections: [
    {
      id: 'intro',
      title: '1. ما هي ملفات تعريف الارتباط؟',
      blocks: [
        {
          type: 'p',
 text: 'ملفات تعريف الارتباط (Cookies) هي ملفات نصية صغيرة تُخزَّن على جهازك عند زيارة موقعنا. تساعدنا على تشغيل المنصة، تذكر تفضيلاتك، وبموافقتكقياس الاستخدام والتسويق.',
        },
      ],
    },
    {
      id: 'categories',
      title: '2. الفئات التي نستخدمها',
      blocks: [
        {
          type: 'callout',
          variant: 'trust',
          title: 'ضرورية Always On',
          text: 'مطلوبة لتسجيل الدخول، الأمان، موازنة الحمل، وتخزين اختيار الموافقة على ملفات تعريف الارتباط. لا يمكن تعطيلها من لوحة التفضيلات.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'تحليلات Analytics',
          text: 'تساعدنا على فهم الصفحات الأكثر زيارة وتحسين تجربة التعلم. تُحمَّل فقط بعد موافقتك. قد تشمل Google Analytics عند تفعيل معرّف القياس في الإعدادات.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'تسويق Marketing',
          text: 'لقياس فعالية الحملات (مثل Meta Pixel) عند تفعيلها وموافقتك. لا تُحمَّل قبل الموافقة.',
        },
      ],
    },
    {
      id: 'storage',
      title: '3. التخزين المحلي',
      blocks: [
        {
          type: 'p',
          text: 'نخزّن اختيارك في localStorage تحت المفتاح emc_cookie_consent_v1 ليبقى بعد إعادة تحميل الصفحة. يمكنك تغييره عبر «إعدادات ملفات تعريف الارتباط» في التذييل.',
        },
      ],
    },
    {
      id: 'manage',
      title: '4. إدارة التفضيلات',
      blocks: [
        {
          type: 'ul',
          items: [
            'اضغط «إعدادات ملفات تعريف الارتباط» في تذييل الموقع',
            'اختر قبول الكل، رفض غير الضرورية، أو تخصيص كل فئة',
            'يمكنك سحب الموافقة لاحقاً من نفس النافذة',
            'للمزيد عن بياناتك راجع سياسة الخصوصية',
          ],
        },
      ],
    },
    {
      id: 'browser',
      title: '5. إعدادات المتصفح',
      blocks: [
        {
          type: 'p',
          text: 'يمكنك أيضاً حذف أو حظر ملفات تعريف الارتباط من إعدادات المتصفح. قد يؤثر ذلك على بعض وظائف المنصة (مثل تسجيل الدخول).',
        },
      ],
    },
    {
      id: 'contact',
      title: '6. التواصل',
      blocks: [
        {
          type: 'p',
          text: `أسئلة حول ملفات تعريف الارتباط: ${LEGAL_CONTACT.general}`,
        },
      ],
    },
  ],
}

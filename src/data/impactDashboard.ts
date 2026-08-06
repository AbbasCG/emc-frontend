/**
 * توضيحي — أرقام عرض تأثير EMC للصفحة العامّة؛ يمكن لاحقاً استبداله باستجابة API.
 */

export type ImpactMainStat = {
  id: string
  /** رقم خام للعداد */
  value: number
  suffix?: string
  labelAr: string
  hintAr: string
}

export const impactMainStats: ImpactMainStat[] = [
  { id: 'registrations', value: 1500, suffix: '+', labelAr: 'تسجيل موثّق', hintAr: 'سجلات مؤكّدة ضمن المنظومة' },
  { id: 'sessions', value: 250, suffix: '+', labelAr: 'جلسة منفّذة', hintAr: 'جلسات تعليمية وورش وحلقات' },
  { id: 'activities', value: 44, labelAr: 'نشاط', hintAr: 'أنشطة موثقة في التقارير' },
  { id: 'countries', value: 17, labelAr: 'دولة', hintAr: 'توزيع جغرافي للمشاركين' },
  { id: 'nl-cities', value: 16, labelAr: 'مدينة هولندية', hintAr: 'تغطية حضور وفعاليات داخل هولندا' },
  { id: 'partners', value: 14, labelAr: 'شريك مؤسسي', hintAr: 'تعاون ضمن اتفاقيات واضحة' },
  { id: 'speakers', value: 22, labelAr: 'متحدّث ومدرّب', hintAr: 'خبراء ساهموا بالمحتوى' },
  { id: 'languages', value: 3, labelAr: 'لغة برامجية', hintAr: 'طرق التوصيل الأساسية' },
]

export const impactNetherlandsCities: { city: string; count: number; xPct: number; yPct: number }[] = [
  { city: 'Ede', count: 51, xPct: 52, yPct: 38 },
  { city: 'Rotterdam', count: 32, xPct: 28, yPct: 58 },
  { city: 'Amsterdam', count: 22, xPct: 38, yPct: 42 },
  { city: 'The Hague', count: 20, xPct: 32, yPct: 48 },
  { city: 'Utrecht', count: 10, xPct: 45, yPct: 44 },
  { city: 'Eindhoven', count: 9, xPct: 55, yPct: 55 },
  { city: 'Nijmegen', count: 8, xPct: 58, yPct: 45 },
  { city: 'Breda', count: 7, xPct: 42, yPct: 58 },
  { city: 'Arnhem', count: 5, xPct: 56, yPct: 40 },
  { city: 'Maastricht', count: 5, xPct: 62, yPct: 68 },
  { city: 'Tilburg', count: 5, xPct: 48, yPct: 54 },
  { city: 'Groningen', count: 4, xPct: 62, yPct: 22 },
]

export const impactCountries: { countryAr: string; count: number }[] = [
  { countryAr: 'هولندا', count: 278 },
  { countryAr: 'اليمن', count: 79 },
  { countryAr: 'تركيا', count: 20 },
  { countryAr: 'سوريا', count: 15 },
  { countryAr: 'مصر', count: 10 },
  { countryAr: 'قطر', count: 5 },
  { countryAr: 'فلسطين', count: 4 },
  { countryAr: 'المملكة المتحدة', count: 3 },
  { countryAr: 'السودان', count: 2 },
  { countryAr: 'الولايات المتحدة', count: 2 },
  { countryAr: 'الإمارات', count: 2 },
  { countryAr: 'الهند', count: 2 },
  { countryAr: 'بلجيكا', count: 1 },
  { countryAr: 'فرنسا', count: 1 },
  { countryAr: 'ألمانيا', count: 1 },
  { countryAr: 'ماليزيا', count: 1 },
  { countryAr: 'عُمان', count: 1 },
]

export const impactProgramDemand: { titleAr: string; demand: number }[] = [
  { titleAr: 'دورة Power BI وتحليل البيانات', demand: 84 },
  { titleAr: 'دورة التسويق الحديث', demand: 78 },
  { titleAr: 'ورشة Power BI المجانية', demand: 60 },
  { titleAr: 'الذكاء الاصطناعي وعلم البيانات', demand: 45 },
  { titleAr: 'الإنجليزية B2 → A2', demand: 42 },
  { titleAr: 'مراجعات للجلسات', demand: 41 },
  { titleAr: 'ورشة التسويق المجانية', demand: 37 },
  { titleAr: 'ورشة التعافي بعد الصدمة', demand: 32 },
  { titleAr: 'الإنجليزية A1 → A0', demand: 30 },
  { titleAr: 'الرياض #4 — يوم AI', demand: 28 },
  { titleAr: 'مدخل للذكاء الاصطناعي', demand: 26 },
  { titleAr: 'إسطنبول #3 — يوم AI', demand: 21 },
]

/** أوزان جمهور نسبية (تُستخدم كشريط مكدّس + ملخص)*/
export const impactAudienceRoles: { roleAr: string; percent: number; tone: 'blue' | 'orange' | 'ink' | 'amber' }[] = [
  { roleAr: 'الطلاب', percent: 58, tone: 'blue' },
  { roleAr: 'الخريجون', percent: 20, tone: 'ink' },
  { roleAr: 'المتطوّعون', percent: 12, tone: 'orange' },
  { roleAr: 'المهتمّون', percent: 10, tone: 'amber' },
]

export type ImpactActivityCategory = 'ورشة' | 'دورة' | 'جلسة' | 'ملتقى'

export type ImpactActivityRow = {
  id: string
  category: ImpactActivityCategory
  titleAr: string
  trainerAr: string
  dateISO: string
  attendance: number
}

export const impactActivities: ImpactActivityRow[] = [
  { id: '1', category: 'دورة', titleAr: 'تحليل بيانات ومقدمة BI', trainerAr: 'د. أمينة الرشيد', dateISO: '2025-11-08', attendance: 64 },
  { id: '2', category: 'ورشة', titleAr: 'التسويق الرقمي المختصر', trainerAr: 'م. فارس المعتوق', dateISO: '2025-10-22', attendance: 52 },
  { id: '3', category: 'جلسة', titleAr: 'استشراف مهارات الذكاء الاصطناعي', trainerAr: 'م. سناء الكردي', dateISO: '2025-09-30', attendance: 118 },
  { id: '4', category: 'ملتقى', titleAr: 'يوم مهني للطلاب الدوليين', trainerAr: 'فريق EMC', dateISO: '2025-09-14', attendance: 210 },
  { id: '5', category: 'ورشة', titleAr: 'الكتابة الأكاديمية بالإنجليزية', trainerAr: 'د. محمد النجار', dateISO: '2025-08-19', attendance: 36 },
  { id: '6', category: 'دورة', titleAr: 'الإعداد للمقابلة المهنية', trainerAr: 'أ. لمى الشهري', dateISO: '2025-08-07', attendance: 41 },
  { id: '7', category: 'جلسة', titleAr: 'الصحة النفسية في بيئة العمل', trainerAr: 'د. هناء العلي', dateISO: '2025-07-26', attendance: 89 },
  { id: '8', category: 'ورشة', titleAr: 'مقدمة في أتمتة المهام', trainerAr: 'م. عبدالله زين', dateISO: '2025-07-11', attendance: 44 },
]

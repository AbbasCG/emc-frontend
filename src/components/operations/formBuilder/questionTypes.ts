import {
  AlignLeft,
  Calendar,
  CircleDot,
  Clock,
  ChevronDown,
  FileText,
  Hash,
  Heading2,
  Image as ImageIcon,
  Link2,
  ListChecks,
  Mail,
  Phone,
  SeparatorHorizontal,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  ToggleLeft,
  Type,
  Upload,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { QuestionConfig, QuestionType } from '@/types/operations'

/**
 * The one list of blocks the builder offers. The library, the canvas, the properties panel and the renderer all read it,
 * so a type exists everywhere or nowhere. A type is listed here only when the server stores it, publishes it, accepts it
 * on the public form and shows it in the response detail.
 */

export type BlockGroupKey = 'basic' | 'selection' | 'rating' | 'layout' | 'uploads'

export const BLOCK_GROUPS: { key: BlockGroupKey; label: string }[] = [
  { key: 'basic', label: 'حقول أساسية' },
  { key: 'selection', label: 'حقول الاختيار' },
  { key: 'rating', label: 'التقييمات' },
  { key: 'layout', label: 'التخطيط والأقسام' },
  { key: 'uploads', label: 'المرفقات والموافقة' },
]

export type BlockDefaults = {
  label: string
  description?: string
  options?: string[]
  config?: QuestionConfig
}

export type TypeSpec = {
  type: QuestionType
  label: string
  hint: string
  group: BlockGroupKey
  icon: LucideIcon
  /** Shapes the form but is never answered (no required flag, no help text, no answers). */
  structural: boolean
  /** The block is a list of options the editor writes. */
  hasOptions: boolean
  /** The grey hint text inside an empty field. */
  hasPlaceholder: boolean
  /** Types an answered-less block of this type may be switched to. */
  convertibleTo: QuestionType[]
  defaults: () => BlockDefaults
}

const TEXT_LIKE: QuestionType[] = ['text', 'textarea', 'email', 'phone', 'url']
const CHOICE_LIKE: QuestionType[] = ['radio', 'checkbox', 'select']

export const TYPE_SPECS: Record<QuestionType, TypeSpec> = {
  text: { type: 'text', label: 'نص قصير', hint: 'إجابة في سطر واحد', group: 'basic', icon: Type, structural: false, hasOptions: false, hasPlaceholder: true, convertibleTo: TEXT_LIKE, defaults: () => ({ label: 'سؤال بدون عنوان' }) },
  textarea: { type: 'textarea', label: 'نص طويل', hint: 'إجابة في فقرة', group: 'basic', icon: AlignLeft, structural: false, hasOptions: false, hasPlaceholder: true, convertibleTo: TEXT_LIKE, defaults: () => ({ label: 'سؤال بدون عنوان' }) },
  email: { type: 'email', label: 'بريد إلكتروني', hint: 'يتحقق من صيغة البريد', group: 'basic', icon: Mail, structural: false, hasOptions: false, hasPlaceholder: true, convertibleTo: TEXT_LIKE, defaults: () => ({ label: 'البريد الإلكتروني' }) },
  phone: { type: 'phone', label: 'رقم هاتف', hint: 'يتحقق من صيغة الرقم', group: 'basic', icon: Phone, structural: false, hasOptions: false, hasPlaceholder: true, convertibleTo: TEXT_LIKE, defaults: () => ({ label: 'رقم الهاتف' }) },
  number: { type: 'number', label: 'رقم', hint: 'مع حد أدنى وأعلى اختياريين', group: 'basic', icon: Hash, structural: false, hasOptions: false, hasPlaceholder: true, convertibleTo: [], defaults: () => ({ label: 'سؤال بدون عنوان' }) },
  url: { type: 'url', label: 'رابط', hint: 'عنوان يبدأ بـ http أو https', group: 'basic', icon: Link2, structural: false, hasOptions: false, hasPlaceholder: true, convertibleTo: TEXT_LIKE, defaults: () => ({ label: 'الرابط' }) },
  date: { type: 'date', label: 'تاريخ', hint: 'اختيار يوم محدد', group: 'basic', icon: Calendar, structural: false, hasOptions: false, hasPlaceholder: false, convertibleTo: [], defaults: () => ({ label: 'التاريخ' }) },
  time: { type: 'time', label: 'وقت', hint: 'ساعة ودقيقة', group: 'basic', icon: Clock, structural: false, hasOptions: false, hasPlaceholder: false, convertibleTo: [], defaults: () => ({ label: 'الوقت' }) },

  radio: { type: 'radio', label: 'اختيار واحد', hint: 'خيار واحد من عدة خيارات', group: 'selection', icon: CircleDot, structural: false, hasOptions: true, hasPlaceholder: false, convertibleTo: CHOICE_LIKE, defaults: () => ({ label: 'سؤال بدون عنوان', options: ['الخيار 1', 'الخيار 2'] }) },
  checkbox: { type: 'checkbox', label: 'اختيارات متعددة', hint: 'يمكن اختيار أكثر من خيار', group: 'selection', icon: ListChecks, structural: false, hasOptions: true, hasPlaceholder: false, convertibleTo: CHOICE_LIKE, defaults: () => ({ label: 'سؤال بدون عنوان', options: ['الخيار 1', 'الخيار 2'] }) },
  select: { type: 'select', label: 'قائمة منسدلة', hint: 'خيار واحد من قائمة', group: 'selection', icon: ChevronDown, structural: false, hasOptions: true, hasPlaceholder: true, convertibleTo: CHOICE_LIKE, defaults: () => ({ label: 'سؤال بدون عنوان', options: ['الخيار 1', 'الخيار 2'] }) },
  // Kept so forms made before the builder still open; the library offers `checkbox` for "multiple choice".
  multiselect: { type: 'multiselect', label: 'قائمة متعددة', hint: 'نوع قديم: اختيارات متعددة', group: 'selection', icon: ListChecks, structural: false, hasOptions: true, hasPlaceholder: false, convertibleTo: ['checkbox'], defaults: () => ({ label: 'سؤال بدون عنوان', options: ['الخيار 1', 'الخيار 2'] }) },
  yes_no: { type: 'yes_no', label: 'نعم / لا', hint: 'سؤال بإجابتين', group: 'selection', icon: ToggleLeft, structural: false, hasOptions: false, hasPlaceholder: false, convertibleTo: [], defaults: () => ({ label: 'سؤال بدون عنوان' }) },

  star_rating: { type: 'star_rating', label: 'تقييم بالنجوم', hint: 'من 3 إلى 10 نجوم', group: 'rating', icon: Star, structural: false, hasOptions: false, hasPlaceholder: false, convertibleTo: [], defaults: () => ({ label: 'قيّم تجربتك', config: { scale: { max: 5 } } }) },
  linear_scale: { type: 'linear_scale', label: 'مقياس خطي', hint: 'رقم ضمن مدى مع عنوانين للطرفين', group: 'rating', icon: SlidersHorizontal, structural: false, hasOptions: false, hasPlaceholder: false, convertibleTo: [], defaults: () => ({ label: 'سؤال بدون عنوان', config: { scale: { min: 1, max: 5 } } }) },

  section: { type: 'section', label: 'عنوان قسم', hint: 'يبدأ قسماً جديداً بعنوان ووصف', group: 'layout', icon: Heading2, structural: true, hasOptions: false, hasPlaceholder: false, convertibleTo: [], defaults: () => ({ label: 'قسم جديد' }) },
  description: { type: 'description', label: 'نص توضيحي', hint: 'فقرة للقراءة بلا إجابة', group: 'layout', icon: FileText, structural: true, hasOptions: false, hasPlaceholder: false, convertibleTo: [], defaults: () => ({ label: '', description: 'اكتب النص التوضيحي هنا' }) },
  page_break: { type: 'page_break', label: 'فاصل صفحة', hint: 'ينقل ما بعده إلى صفحة جديدة', group: 'layout', icon: SeparatorHorizontal, structural: true, hasOptions: false, hasPlaceholder: false, convertibleTo: [], defaults: () => ({ label: '' }) },

  file: { type: 'file', label: 'رفع ملف', hint: 'مستند حتى 5 ميغابايت', group: 'uploads', icon: Upload, structural: false, hasOptions: false, hasPlaceholder: false, convertibleTo: ['image'], defaults: () => ({ label: 'أرفق ملفاً' }) },
  image: { type: 'image', label: 'رفع صورة', hint: 'JPG أو PNG أو WebP', group: 'uploads', icon: ImageIcon, structural: false, hasOptions: false, hasPlaceholder: false, convertibleTo: ['file'], defaults: () => ({ label: 'أرفق صورة' }) },
  consent: { type: 'consent', label: 'موافقة', hint: 'مربع يجب تحديده للمتابعة', group: 'uploads', icon: ShieldCheck, structural: false, hasOptions: false, hasPlaceholder: false, convertibleTo: [], defaults: () => ({ label: 'أوافق على الشروط' }) },
}

/** The order the library lists them in; `multiselect` is a legacy spelling and is not offered. */
export const LIBRARY_TYPES: QuestionType[] = [
  'text', 'textarea', 'email', 'phone', 'number', 'url', 'date', 'time',
  'radio', 'checkbox', 'select', 'yes_no',
  'star_rating', 'linear_scale',
  'section', 'description', 'page_break',
  'file', 'image', 'consent',
]

export const isStructural = (type: QuestionType): boolean => TYPE_SPECS[type]?.structural ?? false
export const hasOptions = (type: QuestionType): boolean => TYPE_SPECS[type]?.hasOptions ?? false
export const isMultiChoice = (type: QuestionType): boolean => type === 'checkbox' || type === 'multiselect'

/** Types that must have at least one option before the server accepts them (a checkbox falls back to yes / no). */
export const OPTIONS_REQUIRED: QuestionType[] = ['select', 'radio', 'multiselect']

export const typeLabel = (type: QuestionType): string => TYPE_SPECS[type]?.label ?? type

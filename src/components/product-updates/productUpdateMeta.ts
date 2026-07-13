import {
  Info, Zap, ArrowRight, Palette, Bug, Bell, Wrench, Shield, AlertTriangle, CheckCircle,
} from 'lucide-react'
import type { ProductUpdate, ProductUpdateCategory, ProductUpdateStatus, UpdateType, MaintenanceSeverity, Priority } from '@/api/productUpdatesApi'

export type TypeMeta = {
  label: string
  color: string
  bg: string
  dot: string
  icon: React.ElementType
}

export const UPDATE_TYPE_META: Record<UpdateType, TypeMeta> = {
  information:     { label: 'معلومات فقط',    color: 'text-slate-700',   bg: 'bg-slate-100 ring-1 ring-slate-300',    dot: 'bg-slate-500',   icon: Info          },
  new_feature:     { label: 'ميزة جديدة',     color: 'text-blue-700',    bg: 'bg-blue-50 ring-1 ring-blue-200',       dot: 'bg-blue-500',    icon: Zap           },
  improvement:     { label: 'تحسين',          color: 'text-emerald-700', bg: 'bg-emerald-50 ring-1 ring-emerald-200', dot: 'bg-emerald-500', icon: ArrowRight     },
  redesign:        { label: 'إعادة تصميم',    color: 'text-purple-700',  bg: 'bg-purple-50 ring-1 ring-purple-200',   dot: 'bg-purple-500',  icon: Palette        },
  bug_fix:         { label: 'إصلاح خطأ',      color: 'text-orange-700',  bg: 'bg-orange-50 ring-1 ring-orange-200',   dot: 'bg-orange-500',  icon: Bug            },
  announcement:    { label: 'إعلان عام',       color: 'text-gray-700',    bg: 'bg-gray-100 ring-1 ring-gray-300',      dot: 'bg-gray-500',    icon: Bell           },
  maintenance:     { label: 'صيانة',           color: 'text-amber-700',   bg: 'bg-amber-50 ring-1 ring-amber-200',     dot: 'bg-amber-500',   icon: Wrench         },
  security_update: { label: 'تحديث أمني',     color: 'text-red-700',     bg: 'bg-red-50 ring-1 ring-red-200',         dot: 'bg-red-500',     icon: Shield         },
  action_required: { label: 'يتطلب إجراء',    color: 'text-rose-700',    bg: 'bg-rose-50 ring-1 ring-rose-200',       dot: 'bg-rose-500',    icon: AlertTriangle  },
  mandatory_update:{ label: 'تحديث إلزامي',   color: 'text-indigo-700',  bg: 'bg-indigo-50 ring-1 ring-indigo-200',   dot: 'bg-indigo-500',  icon: CheckCircle    },
}

export const CATEGORY_META: Record<ProductUpdateCategory, { label: string; color: string; bg: string }> = {
  feature:      { label: 'ميزة جديدة',  color: 'text-blue-700',    bg: 'bg-blue-50 ring-1 ring-blue-200'    },
  improvement:  { label: 'تحسين',       color: 'text-emerald-700', bg: 'bg-emerald-50 ring-1 ring-emerald-200' },
  fix:          { label: 'إصلاح',       color: 'text-orange-700',  bg: 'bg-orange-50 ring-1 ring-orange-200' },
  security:     { label: 'أمان',        color: 'text-red-700',     bg: 'bg-red-50 ring-1 ring-red-200'      },
  announcement: { label: 'إعلان',       color: 'text-purple-700',  bg: 'bg-purple-50 ring-1 ring-purple-200'},
}

export const STATUS_META: Record<ProductUpdateStatus, { label: string; color: string; dot: string }> = {
  draft:     { label: 'مسودة',  color: 'text-slate-600',   dot: 'bg-slate-400'   },
  published: { label: 'منشور', color: 'text-emerald-700',  dot: 'bg-emerald-500' },
  archived:  { label: 'مؤرشف', color: 'text-rose-600',     dot: 'bg-rose-400'    },
}

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  low:      { label: 'منخفضة',  color: 'text-slate-600'   },
  medium:   { label: 'متوسطة',  color: 'text-amber-600'   },
  high:     { label: 'عالية',   color: 'text-orange-600'  },
  critical: { label: 'حرجة',    color: 'text-red-600'     },
}

export const SEVERITY_META: Record<MaintenanceSeverity, { label: string; color: string }> = {
  low:      { label: 'منخفضة',  color: 'text-slate-600'  },
  medium:   { label: 'متوسطة',  color: 'text-amber-600'  },
  high:     { label: 'عالية',   color: 'text-orange-600' },
  critical: { label: 'حرجة',    color: 'text-red-600'    },
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'مدير النظام',
  tech_admin: 'مدير تقني',
  admin: 'مدير',
  executive_admin: 'مدير تنفيذي',
  department_manager: 'مدير قسم',
  programs_manager: 'مدير برامج',
  marketing_manager: 'مدير تسويق',
  finance_manager: 'المدير المالي',
  hr_manager: 'مدير الموارد',
  operations_manager: 'مدير عمليات',
  support_agent: 'دعم فني',
  instructor: 'مدرب',
  student: 'طالب',
  volunteer: 'متطوع',
  partner: 'شريك',
}

export const ALL_UPDATE_TYPES = Object.keys(UPDATE_TYPE_META) as UpdateType[]

export const ALL_ROLES = [
  'super_admin', 'tech_admin', 'admin', 'executive_admin', 'department_manager',
  'programs_manager', 'marketing_manager', 'finance_manager', 'hr_manager',
  'operations_manager', 'support_agent', 'instructor', 'student', 'volunteer', 'partner',
]

export function typeToCategoryDefault(t: UpdateType): ProductUpdateCategory {
  const map: Partial<Record<UpdateType, ProductUpdateCategory>> = {
    new_feature: 'feature',
    improvement: 'improvement',
    redesign: 'improvement',
    bug_fix: 'fix',
    security_update: 'security',
  }
  return map[t] ?? 'announcement'
}

export function getTypeMeta(item: ProductUpdate): TypeMeta {
  if (item.update_type && UPDATE_TYPE_META[item.update_type]) {
    return UPDATE_TYPE_META[item.update_type]
  }
  const cat = CATEGORY_META[item.category]
  return { label: cat.label, color: cat.color, bg: cat.bg, dot: 'bg-gray-400', icon: Bell }
}

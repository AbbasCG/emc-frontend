import React from 'react';
import type { TicketStatus } from '@/types/ticket';
import { Clock, CheckCircle2, AlertCircle, XCircle, UserCheck, PlayCircle, Ban } from 'lucide-react';

interface TicketStatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'PENDING_APPROVAL':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>معلقة (بانتظار الاعتماد)</span>
        </span>
      );
    case 'ASSIGNED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 ${className}`}>
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>معتمدة ومحالة للمكلف</span>
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 ${className}`}>
          <PlayCircle className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
          <span>قيد المعالجة والتنفيذ</span>
        </span>
      );
    case 'RESOLVED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>تم الحل والإغلاق</span>
        </span>
      );
    case 'UNRESOLVED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 ${className}`}>
          <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
          <span>تعذر الحل (مع رفع التقرير)</span>
        </span>
      );
    case 'REJECTED_BY_ADMIN':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>مرفوضة من الإدارة</span>
        </span>
      );
    case 'REJECTED_BY_ASSIGNEE':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200 ${className}`}>
          <Ban className="w-3.5 h-3.5 text-pink-600" />
          <span>مرفوضة من المكلف</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 ${className}`}>
          <span>{status}</span>
        </span>
      );
  }
};

export default TicketStatusBadge;

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SlaCountdownTimerProps {
  expectedTime?: string;
  status: string;
  className?: string;
  showIcon?: boolean;
}

export const SlaCountdownTimer: React.FC<SlaCountdownTimerProps> = ({
  expectedTime,
  status,
  className = '',
  showIcon = true,
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    if (!expectedTime || ['RESOLVED', 'REJECTED_BY_ADMIN', 'UNRESOLVED'].includes(status)) {
      setTimeLeft(null);
      return;
    }

    const calculateTime = () => {
      const target = new Date(expectedTime).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds, isExpired: false });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [expectedTime, status]);

  if (['RESOLVED', 'REJECTED_BY_ADMIN', 'UNRESOLVED'].includes(status)) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
        {showIcon && <CheckCircle2 className="w-3.5 h-3.5" />}
        <span>مكتملة / مغلقة</span>
      </span>
    );
  }

  if (!expectedTime) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 ${className}`}>
        {showIcon && <Clock className="w-3.5 h-3.5" />}
        <span>في انتظار الاعتماد</span>
      </span>
    );
  }

  if (!timeLeft) return null;

  if (timeLeft.isExpired) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse ${className}`}>
        {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
        <span>متأخرة عن مهلة الـ SLA</span>
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200 ${className}`}>
      {showIcon && <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />}
      <span dir="ltr">
        {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </span>
      <span className="font-sans text-[11px] text-amber-700">متبقي للحل</span>
    </div>
  );
};

export default SlaCountdownTimer;

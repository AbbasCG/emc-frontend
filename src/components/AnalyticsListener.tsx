import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { installErrorTracking, trackPageview } from '@/lib/analyticsTracker'

/**
 * يربط متتبع الزوار بالراوتر: مشاهدة صفحة عند كل تنقل، ومستمعو الأخطاء مرة
 * واحدة عند الإقلاع. كل الإرسال خلف موافقة «التحليلات» في لافتة الكوكيز.
 */
export default function AnalyticsListener() {
  const { pathname } = useLocation()

  useEffect(() => {
    installErrorTracking()
  }, [])

  useEffect(() => {
    trackPageview(pathname)
  }, [pathname])

  return null
}

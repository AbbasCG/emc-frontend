/**
 * معايير تقييم الأداء العشرة — موحّدة بين تقارير الاجتماعات والتقارير
 * الأسبوعية، وكل معيار يُقيَّم من 1 إلى 10. المفاتيح تُخزَّن في الخلفية
 * (scores json) فلا تُغيَّر دون ترحيل.
 *
 * الربط بنقاط الأثر (App\Services\ImpactPoints):
 * متوسط ≥ 9 → +50 نقطة جودة · متوسط ≥ 7 → +25 · الحضور نفسه +50 (سقف 200/شهر).
 */

export interface EvaluationCriterion {
  key: string
  label: string
}

export const EVALUATION_CRITERIA: EvaluationCriterion[] = [
  { key: 'attendance', label: 'الالتزام بالحضور والوقت' },
  { key: 'delivery', label: 'إنجاز المطلوب' },
  { key: 'quality', label: 'جودة العمل' },
  { key: 'deadlines', label: 'الالتزام بالمواعيد' },
  { key: 'initiative', label: 'المبادرة وحل المشكلات' },
  { key: 'collaboration', label: 'التعاون مع الفريق' },
  { key: 'communication', label: 'التواصل والوضوح' },
  { key: 'responsibility', label: 'تحمل المسؤولية' },
  { key: 'focus', label: 'الالتزام بالأولويات' },
  { key: 'impact', label: 'الأثر الإجمالي' },
]

export type CriteriaScores = Record<string, number>

export function averageScore(scores: CriteriaScores): number | null {
  const values = Object.values(scores).filter((v) => v >= 1 && v <= 10)
  if (values.length === 0) return null
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

export type AiAssistantPersona =
  | 'student'
  | 'trainer'
  | 'operations'
  | 'reports'
  | 'support'

export type AiContextScope =
  | 'knowledge'
  | 'meetings'
  | 'reports'
  | 'tasks'
  | 'lms'
  | 'documents'
  | 'programs'

export type AiConversationThread = {
  id: number
  title: string
  persona: AiAssistantPersona
  updated_at: string
  pinned?: boolean
}

export type AiChatMessage = {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  streaming?: boolean
}

export type AiSuggestedPrompt = {
  id: string
  text: string
  persona: AiAssistantPersona
}

export type AiSearchResult = {
  id: number | string
  title: string
  href: string
  subtitle?: string
  relevance: number
  quick_action?: string
}

export type AiSearchGroup = {
  scope: AiContextScope
  label: string
  items: AiSearchResult[]
}

export type AiSearchResponse = {
  query: string
  groups: AiSearchGroup[]
}

export type AiRecommendationPriority = 'low' | 'medium' | 'high' | 'critical'

export type AiRecommendation = {
  id: string
  audience: 'student' | 'admin'
  title: string
  description: string
  priority: AiRecommendationPriority
  href?: string
}

export type AiInsightSeverity = 'info' | 'warning' | 'high' | 'critical'

export type AiInsight = {
  id: string
  title: string
  description: string
  severity: AiInsightSeverity
  score?: number
  metric_label?: string
}

export type AiMeetingIntelligence = {
  meeting_id: number
  summary: string
  decisions: string[]
  action_items: { id: number; text: string; owner?: string; due_at?: string }[]
  blockers: string[]
  follow_ups: string[]
  risk_level: AiInsightSeverity
}

export type AiGenerationKind =
  | 'course_outline'
  | 'workshop_plan'
  | 'quiz'
  | 'marketing_copy'
  | 'report_summary'

export type AiGenerationRecord = {
  id: number
  kind: AiGenerationKind
  title: string
  prompt: string
  output_markdown: string
  created_at: string
}

export type AiAutomationStatus = 'active' | 'paused' | 'failed'

export type AiAutomationFlow = {
  id: number
  name: string
  trigger: string
  action: string
  status: AiAutomationStatus
  last_run_at?: string
}

export type AiAutomationRun = {
  id: number
  automation_id: number
  status: 'success' | 'failed' | 'running'
  started_at: string
  finished_at?: string
  logs: string[]
}

export type AiUsageSnapshot = {
  requests_count: number
  estimated_cost_usd: number
  failed_generations: number
  tokens_total: number
  models: { name: string; requests: number; tokens: number }[]
  top_users: { id: string; name: string; requests: number }[]
  top_prompts: { text: string; count: number }[]
}

import type { CSSProperties } from 'react'

export const EMC_CHART_PALETTE = ['#0077B6', '#F28C00', '#0C2A4B', '#10B981', '#6366F1', '#94A3B8'] as const

export const emcTooltipStyle: CSSProperties = {
  borderRadius: 14,
  border: '1px solid rgba(12,42,75,0.08)',
  boxShadow: '0 22px 50px -24px rgba(15,42,67,0.22)',
}

export const emcTooltipLabelStyle = { color: '#0C2A4B', fontWeight: 900, fontSize: 12 }

export const emcTooltipItemStyle = { color: '#0C2A4B', fontWeight: 700, fontSize: 12 }

import type { LucideIcon } from 'lucide-react'
import {
  Award,
  Building2,
  Crown,
  Flag,
  HeartHandshake,
  Layers,
  Lightbulb,
  Megaphone,
  Scale,
  Settings,
  Shield,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'

const ALIAS: Record<string, LucideIcon> = {
  crown: Crown,
  shield: Shield,
  shieldcheck: Shield,
  users: Users,
  layers: Layers,
  building: Building2,
  building2: Building2,
  target: Target,
  award: Award,
  flag: Flag,
  scale: Scale,
  settings: Settings,
  sparkles: Sparkles,
  lightbulb: Lightbulb,
  megaphone: Megaphone,
  heartHandshake: HeartHandshake,
  hearthandshake: HeartHandshake,
}

export function resolveDepartmentIcon(iconKey: string | undefined | null): LucideIcon {
  const key = iconKey?.trim().toLowerCase().replace(/\s+/g, '-').replace(/_/g, '') ?? ''
  const simplified = iconKey?.trim().toLowerCase().replace(/[-_\s]/g, '') ?? ''
  return ALIAS[key] ?? ALIAS[simplified] ?? Building2
}

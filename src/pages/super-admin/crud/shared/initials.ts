export function initialsFromName(name: string): string {
  const p = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return ([...p[0]![0]][0] ?? '?').toUpperCase()
  const a = [...p[0]![0]][0] ?? ''
  const b = [...p[p.length - 1]![0]][0] ?? ''
  return `${a}${b}`.toUpperCase() || '?'
}

/** «N متطوعين قدامى بلا حساب…» with the Arabic number agreement (one, two, 3-10, 11+). */
export function withoutAccountMessage(n: number): string {
  if (n === 1) return 'متطوع قديم واحد بلا حساب لا يمكن منحه نقاطًا حتى يُحوَّل بحساب.'
  if (n === 2) return 'متطوعان قديمان بلا حساب لا يمكن منحهما نقاطًا حتى يُحوَّلا بحساب.'
  const noun = n >= 11 ? 'متطوعًا قديمًا' : 'متطوعين قدامى'
  return `${n.toLocaleString('en-US')} ${noun} بلا حساب لا يمكن منحهم نقاطًا حتى يُحوَّلوا بحساب.`
}


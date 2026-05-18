const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%&*-+=?'

/** Crypto-secure index in `[0, max)`. */
function randomIndex(max: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0]! % max
}

function randomChar(pool: string): string {
  return pool[randomIndex(pool.length)]!
}

/** 12–16 chars, guarantees at least one upper, lower, digit, symbol. */
export function generateSecurePassword(desiredLen = 14): string {
  const len = Math.min(Math.max(Math.floor(desiredLen), 12), 16)

  const required = [
    randomChar(UPPER),
    randomChar(LOWER),
    randomChar(DIGITS),
    randomChar(SYMBOLS),
  ]

  const all = UPPER + LOWER + DIGITS + SYMBOLS
  const rest: string[] = []
  while (required.length + rest.length < len) rest.push(randomChar(all))

  const chars = [...required, ...rest]
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
  }
  return chars.join('')
}

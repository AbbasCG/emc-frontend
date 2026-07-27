#!/usr/bin/env node
/**
 * M6.b — default Open Graph image (1200x630) from V3 brand primitives:
 * dawn gradient + official white logo + the tricolor signature bar.
 * Deterministic build artifact: `node scripts/generate-og-image.mjs`
 * writes public/brand/og-default.png (committed, referenced by PublicSeo).
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const W = 1200
const H = 630
const BAR = 8

// V3 dawn gradient (152deg approximated vertically for the flat OG canvas) +
// subtle cyan glow + ghost grid. Tricolor bar: orange 0-22% / cyan 22-58% / ice 58-100%.
const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="dawn" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#06182C"/>
      <stop offset="0.52" stop-color="#0C2A4B"/>
      <stop offset="1" stop-color="#10456E"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.2" r="0.6">
      <stop offset="0" stop-color="#089FE0" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#089FE0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ember" cx="0.1" cy="0.95" r="0.5">
      <stop offset="0" stop-color="#F28C00" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#F28C00" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#dawn)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect width="${W}" height="${H}" fill="url(#ember)"/>
  <rect y="${H - BAR}" width="${W * 0.22}" height="${BAR}" fill="#F28C00"/>
  <rect y="${H - BAR}" x="${W * 0.22}" width="${W * 0.36}" height="${BAR}" fill="#089FE0"/>
  <rect y="${H - BAR}" x="${W * 0.58}" width="${W * 0.42}" height="${BAR}" fill="#A6D6F2"/>
</svg>`

const logoPath = join(root, 'public/brand/logos/logo_full_white.png')
const outPath = join(root, 'public/brand/og-default.png')

const logo = await sharp(logoPath)
  .resize({ width: 520, fit: 'inside' })
  .toBuffer()
const logoMeta = await sharp(logo).metadata()

await sharp(Buffer.from(svg))
  .composite([
    {
      input: logo,
      left: Math.round((W - (logoMeta.width ?? 520)) / 2),
      top: Math.round((H - BAR - (logoMeta.height ?? 200)) / 2),
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(outPath)

const { size } = await sharp(outPath).metadata().then(async (m) => ({ size: (await import('node:fs')).statSync(outPath).size, ...m }))
console.log(`✓ wrote public/brand/og-default.png (${W}x${H}, ${(size / 1024).toFixed(0)}KB)`)

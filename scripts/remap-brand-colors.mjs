#!/usr/bin/env node
/**
 * EMC brand color remap — V1 (legacy) → V2.2/V3 palette (identical hexes in both).
 *
 * Idempotent: running twice produces zero changes. Scope: all .ts/.tsx/.css under src.
 * Usage:
 *   node scripts/remap-brand-colors.mjs --dry            # report only (per-file counts)
 *   node scripts/remap-brand-colors.mjs                  # apply
 *   node scripts/remap-brand-colors.mjs --exclude <p>    # skip path(s) (repeatable, substring match)
 *
 * Mappings (case-insensitive on hex):
 *   Hex:  #2691C2→#0077B6  #EC943C→#F28C00  #22334A→#0C2A4B  #1A3A5C→#0E5A8A
 *         #0D1B2A→#06182C  #1B6489→#0E5A8A  #1E7AA8→#0077B6  #1A455D→#0C2A4B
 *         #0F2D3E→#06182C  #D67C28→#DD7C02  #B9872F→#D67C28  #A87928→#B16221  #B36A1F→#C97208
 *   rgba (decimal triplets, spaces collapsed — Tailwind arbitrary-value safe):
 *         38,145,194→0,119,182   236,148,60→242,140,0   34,51,74→12,42,75
 *   Also normalizes spaced rgba() of the three TARGET triplets to no-space form
 *   (spaces inside rgba() silently break Tailwind arbitrary values like shadow-[...]).
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const DRY = process.argv.includes('--dry');
const EXCLUDES = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--exclude' && process.argv[i + 1]) EXCLUDES.push(process.argv[++i].replaceAll('\\', '/'));
}

const HEX_MAP = {
  '#2691c2': '#0077B6', '#ec943c': '#F28C00', '#22334a': '#0C2A4B',
  '#1a3a5c': '#0E5A8A', '#0d1b2a': '#06182C', '#1b6489': '#0E5A8A',
  '#1e7aa8': '#0077B6', '#1a455d': '#0C2A4B', '#0f2d3e': '#06182C',
  '#d67c28': '#DD7C02', '#b9872f': '#D67C28', '#a87928': '#B16221', '#b36a1f': '#C97208',
};
const RGBA_MAP = [
  [/(?<![0-9])38\s*,\s*145\s*,\s*194/g, '0,119,182'],
  [/(?<![0-9])236\s*,\s*148\s*,\s*60(?![0-9])/g, '242,140,0'],
  [/(?<![0-9])34\s*,\s*51\s*,\s*74(?![0-9])/g, '12,42,75'],
  // normalize spaced target triplets (idempotence for the no-space rule)
  [/(?<![0-9])0\s*,\s*119\s*,\s*182/g, '0,119,182'],
  [/(?<![0-9])242\s*,\s*140\s*,\s*0(?![0-9.])/g, '242,140,0'],
  [/(?<![0-9])12\s*,\s*42\s*,\s*75(?![0-9])/g, '12,42,75'],
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (['.ts', '.tsx', '.css'].includes(extname(p))) yield p;
  }
}

let filesChanged = 0, totalRepl = 0;
const report = [];
for (const file of walk('src')) {
  const norm = file.replaceAll('\\', '/');
  if (EXCLUDES.some((e) => norm.includes(e))) continue;
  const orig = readFileSync(file, 'utf8');
  let next = orig, count = 0;
  for (const [from, to] of Object.entries(HEX_MAP)) {
    next = next.replace(new RegExp(from, 'gi'), (m) => { count++; return to; });
  }
  for (const [re, to] of RGBA_MAP) {
    next = next.replace(re, (m) => { if (m !== to) count++; return to; });
  }
  if (next !== orig) {
    filesChanged++; totalRepl += count;
    report.push(`${norm}: ${count}`);
    if (!DRY) writeFileSync(file, next);
  }
}
console.log((DRY ? '[DRY-RUN] ' : '[APPLIED] ') + `${filesChanged} files, ${totalRepl} replacements`);
for (const line of report) console.log('  ' + line);

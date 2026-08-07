import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import rawHexBaseline from './scripts/raw-hex-baseline.json' with { type: 'json' }

// M7.C — raw hex colours must come from the design tokens (tailwind.config.js), never
// from literals like `text-[#0C2A4B]`, so the app re-skins from one place and the V3
// brand laws stay enforceable. The M0 V1→V3 remap left 5,494 literals across 384 files;
// converting them is a wide refactor that plan v2.1 rules out, so the rule runs at
// `error` for every file that is ALREADY clean (new files included) and the legacy set
// below is exempted. `npm run check:brand` guards the exempt files from growing.
// The list may only shrink — deleting an entry is the goal, adding one needs a reason.
const RAW_HEX_LEGACY = Object.keys(rawHexBaseline.files)
const RAW_HEX_MESSAGE =
  'Raw hex colour. Use a design token instead: text-navy (#0C2A4B) · text-customBlue (#0077B6) · bg-customOrange (#F28C00) · brand-50…950. A genuinely new colour means a new token in tailwind.config.js.'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Restored to the recommended `error` in M4.a once all 245 violations across 184
      // files were refactored — see docs/04-references/effect-patterns.md for the three
      // legal shapes (inline async IIFE, subscription callback, render-phase adjustment).
      'react-hooks/set-state-in-effect': 'error',
      // Honour the `_`-prefix convention for intentionally-unused bindings.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Restored to `error` in M4.a once every mixed component+constant module was split
      // into a component file and a sibling `*.ts` holding its constants/helpers/hooks.
      'react-refresh/only-export-components': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: RAW_HEX_LEGACY,
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?\\b/]',
          message: RAW_HEX_MESSAGE,
        },
        {
          selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?\\b/]',
          message: RAW_HEX_MESSAGE,
        },
      ],
    },
  },
])

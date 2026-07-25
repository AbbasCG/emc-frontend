import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

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
])

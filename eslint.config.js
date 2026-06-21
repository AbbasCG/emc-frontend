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
      // Recommended preset flags many legitimate “reset UI on navigation” / “fetch on mount”
      // patterns. Warn-only keeps CI usable until refactors adopt useEffectEvent / alternatives.
      'react-hooks/set-state-in-effect': 'warn',
      // Honour the `_`-prefix convention for intentionally-unused bindings.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Fast-Refresh boundary hint — a dev-only DX rule with no runtime impact. Kept as a warning
      // so mixed component+constant files don't block CI; proper file-splitting is tracked in the backlog.
      'react-refresh/only-export-components': 'warn',
    },
  },
])

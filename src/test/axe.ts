import { axe } from 'vitest-axe'

/**
 * Runs axe against a rendered container with the rule set M4.d gates on.
 *
 * Scoped to WCAG 2.1 A/AA — the acceptance target in the master plan — and with
 * `region` disabled, since a component rendered in isolation has no surrounding
 * landmark and would fail that rule for a reason that never occurs in the real page.
 */
export async function axeCheck(container: Element) {
  return axe(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { region: { enabled: false } },
  })
}

import '@testing-library/jest-dom'

// jsdom has no ResizeObserver — DropdownPortal (used by EmcDatePicker and
// other floating menus) needs a stand-in so tests can open those dropdowns.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

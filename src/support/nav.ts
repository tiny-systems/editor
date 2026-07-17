// Navigation shim. The platform navigates with Nuxt's global navigateTo(); the
// library has no router, so fall back to a full-page navigation. Hosts that
// embed the editor inside an SPA router can intercept these hrefs, or simply
// not surface the controls that use them.
export function navigateTo(path: string): void {
  if (typeof window !== 'undefined' && path) {
    window.location.assign(path)
  }
}

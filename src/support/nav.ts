// Navigation shim. Components lifted from the platform navigate with Nuxt's
// global navigateTo() to platform URLs (/<ws>/project-<p>/flow-<id>). The
// library has no router, so a host can register its own navigator to route
// those intents into its SPA; otherwise we fall back to a full-page load.

type Navigator = (path: string) => void

let handler: Navigator | null = null

// setNavigator lets a host (e.g. the tiny SPA) intercept navigation and route
// it through its own router instead of a full-page reload. The host receives
// the platform-style path and maps it to its routes.
export function setNavigator(fn: Navigator | null): void {
  handler = fn
}

export function navigateTo(path: string): void {
  if (!path) return
  if (handler) {
    handler(path)
    return
  }
  if (typeof window !== 'undefined') {
    window.location.assign(path)
  }
}

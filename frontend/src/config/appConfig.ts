// Central place for all app-level configuration.
// All VITE_* vars are baked in at build time by Vite.
// Change VITE_APP_NAME in .env to rename the app everywhere.

export const appConfig = {
  name:       import.meta.env.VITE_APP_NAME       ?? 'मानसरोवर',
  tagline:    import.meta.env.VITE_APP_TAGLINE     ?? 'Divine Knowledge Vault',
  logoLetter: import.meta.env.VITE_APP_LOGO_LETTER ?? 'म',
  apiUrl:     import.meta.env.VITE_API_URL         ?? 'http://localhost:5000/api',
} as const

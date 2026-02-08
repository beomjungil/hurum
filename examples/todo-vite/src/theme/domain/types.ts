export type ThemeDeps = {
  [key: string]: unknown
  getPrefersDark: () => boolean
  applyTheme: (dark: boolean) => void
}

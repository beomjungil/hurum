// Design tokens for the devtools dark theme — Hurum brand palette
// Brand accent: Dark #2B98FF / Light #0084FF
// Background: #0c0d14

export const colors = {
  bg: '#0c0d14',
  bgPanel: '#11121a',
  bgEntry: '#161722',
  bgEntryHover: '#1c1d2c',
  bgInput: '#0e0f18',
  border: 'hsl(220, 6%, 16%)',
  borderLight: 'hsl(220, 5%, 20%)',
  text: '#c9d1d9',
  textMuted: '#6b7d8e',
  textBright: '#e6edf3',

  // Entry type accent colors
  event: '#2B98FF',
  intent: '#d2a8ff',
  error: '#ff6b7a',
  stateChange: '#3fb950',

  // Entry type background tints
  eventBg: 'rgba(43, 152, 255, 0.08)',
  intentBg: 'rgba(210, 168, 255, 0.08)',
  errorBg: 'rgba(255, 107, 122, 0.08)',
  stateChangeBg: 'rgba(63, 185, 80, 0.08)',

  // JSON tree value colors
  string: '#e3b341',
  number: '#56d4dd',
  boolean: '#2B98FF',
  null: '#4a5f78',
  key: '#58a6ff',
  computed: '#d2a8ff',
  nested: '#7ee8fa',

  // Interactive
  accent: '#2B98FF',
  accentHover: '#58a6ff',
  accentDim: 'rgba(43, 152, 255, 0.15)',
} as const

export const spacing = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
} as const

export const fontFamily =
  'ui-monospace, "SF Mono", "Cascadia Code", Menlo, Monaco, "Courier New", monospace'

export const fontSize = {
  xs: '10px',
  sm: '11px',
  md: '12px',
  lg: '13px',
} as const

export const radius = {
  sm: '3px',
  md: '5px',
  lg: '8px',
} as const

export const zIndex = {
  button: 2147483646,
  panel: 2147483647,
} as const

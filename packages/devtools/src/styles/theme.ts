import type { CSSProperties } from 'react'
import { colors, spacing, fontFamily, fontSize, radius, zIndex } from './tokens'

export const theme = {
  panelContainer: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '420px',
    height: '100vh',
    background: colors.bgPanel,
    color: colors.text,
    fontFamily,
    fontSize: fontSize.md,
    lineHeight: '1.5',
    zIndex: zIndex.panel,
    boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.5)',
    borderLeft: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  } satisfies CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing.md}px ${spacing.lg}px`,
    borderBottom: `1px solid ${colors.border}`,
    background: colors.bg,
    flexShrink: 0,
  } satisfies CSSProperties,

  headerTitle: {
    fontWeight: 600,
    fontSize: fontSize.lg,
    color: colors.textBright,
    margin: 0,
  } satisfies CSSProperties,

  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: `${spacing.sm}px`,
  } satisfies CSSProperties,

  iconButton: {
    background: 'none',
    border: 'none',
    color: colors.textMuted,
    cursor: 'pointer',
    padding: `${spacing.sm}px`,
    borderRadius: radius.sm,
    fontSize: fontSize.md,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies CSSProperties,

  tabBar: {
    display: 'flex',
    borderBottom: `1px solid ${colors.border}`,
    background: colors.bg,
    flexShrink: 0,
  } satisfies CSSProperties,

  tab: {
    padding: `${spacing.md}px ${spacing.xl}px`,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: colors.textMuted,
    cursor: 'pointer',
    fontSize: fontSize.sm,
    fontFamily,
    fontWeight: 500,
  } satisfies CSSProperties,

  tabActive: {
    color: colors.accent,
    borderBottomColor: colors.accent,
  } satisfies CSSProperties,

  content: {
    flex: 1,
    overflow: 'auto',
    padding: `${spacing.md}px`,
  } satisfies CSSProperties,

  badge: (color: string, bgColor: string): CSSProperties => ({
    display: 'inline-block',
    padding: `1px ${spacing.sm}px`,
    borderRadius: radius.sm,
    fontSize: fontSize.xs,
    fontWeight: 600,
    color,
    background: bgColor,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }),

  input: {
    background: colors.bgInput,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    color: colors.text,
    padding: `${spacing.sm}px ${spacing.md}px`,
    fontSize: fontSize.sm,
    fontFamily,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  } satisfies CSSProperties,

  toggleButton: {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: colors.bgPanel,
    border: `1px solid ${colors.border}`,
    color: colors.accent,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 700,
    fontFamily,
    zIndex: zIndex.button,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  } satisfies CSSProperties,

  entryRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: `${spacing.md}px`,
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: radius.sm,
    cursor: 'pointer',
    fontSize: fontSize.sm,
    borderBottom: `1px solid ${colors.border}`,
  } satisfies CSSProperties,

  timestamp: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily,
    flexShrink: 0,
    minWidth: '52px',
  } satisfies CSSProperties,

  entryName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } satisfies CSSProperties,

  jsonKey: {
    color: colors.key,
  } satisfies CSSProperties,

  jsonString: {
    color: colors.string,
  } satisfies CSSProperties,

  jsonNumber: {
    color: colors.number,
  } satisfies CSSProperties,

  jsonBoolean: {
    color: colors.boolean,
  } satisfies CSSProperties,

  jsonNull: {
    color: colors.null,
    fontStyle: 'italic',
  } satisfies CSSProperties,

  treeRow: {
    display: 'flex',
    alignItems: 'flex-start',
    lineHeight: '1.6',
    fontFamily,
    fontSize: fontSize.sm,
  } satisfies CSSProperties,

  treeToggle: {
    width: '14px',
    height: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: colors.textMuted,
    flexShrink: 0,
    background: 'none',
    border: 'none',
    padding: 0,
    fontFamily,
    fontSize: fontSize.xs,
    marginTop: '2px',
  } satisfies CSSProperties,

  transactionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: `${spacing.md}px`,
    padding: `${spacing.sm}px ${spacing.md}px`,
    background: colors.intentBg,
    borderRadius: radius.sm,
    cursor: 'pointer',
    borderBottom: `1px solid ${colors.border}`,
  } satisfies CSSProperties,

  transactionChildren: {
    paddingLeft: `${spacing.xl}px`,
    borderLeft: `2px solid ${colors.border}`,
    marginLeft: `${spacing.lg}px`,
  } satisfies CSSProperties,

  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: `${spacing.md}px`,
    padding: `${spacing.md}px 0`,
    flexShrink: 0,
  } satisfies CSSProperties,

  filterChip: (active: boolean): CSSProperties => ({
    padding: `2px ${spacing.md}px`,
    borderRadius: radius.md,
    border: `1px solid ${active ? colors.accent : colors.border}`,
    background: active ? colors.accentDim : 'transparent',
    color: active ? colors.accent : colors.textMuted,
    cursor: 'pointer',
    fontSize: fontSize.xs,
    fontFamily,
  }),

  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    padding: `${spacing.xxl}px`,
    fontSize: fontSize.sm,
  } satisfies CSSProperties,

  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: `${spacing.md}px 0 ${spacing.sm}px`,
    borderBottom: `1px solid ${colors.border}`,
    marginBottom: `${spacing.sm}px`,
  } satisfies CSSProperties,
} as const

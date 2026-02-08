import { theme } from '../styles/theme'
import { colors } from '../styles/tokens'
import { HurumIcon } from './hurum-icon'

interface ToggleButtonProps {
  onClick: () => void
  hasErrors: boolean
  isOpen: boolean
}

export function ToggleButton({ onClick, hasErrors, isOpen }: ToggleButtonProps) {
  if (isOpen) return null
  return (
    <button
      onClick={onClick}
      style={{
        ...theme.toggleButton,
        borderColor: hasErrors ? colors.error : colors.border,
      }}
      title="Hurum DevTools (Ctrl+Shift+D)"
      aria-label="Toggle Hurum DevTools"
    >
      <HurumIcon
        size={20}
        color={hasErrors ? colors.error : colors.accent}
      />
    </button>
  )
}

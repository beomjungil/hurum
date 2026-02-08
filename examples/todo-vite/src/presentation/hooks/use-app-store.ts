import { useStore } from '@hurum/react'
import { AppStore } from '../../app/domain'

export function useAppStore() {
  return useStore(AppStore)
}

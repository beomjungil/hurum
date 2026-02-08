// @hurum/react — withProvider HOC

import { useState, type ComponentType } from 'react'
import type { StoreDefinition } from '@hurum/core'
import { getContext } from './singleton'

/**
 * HOC that wraps a component with a fresh store instance on each mount.
 * Useful for modals, wizards, and other isolated UI.
 */
export function withProvider<P extends object>(
  def: StoreDefinition,
  WrappedComponent: ComponentType<P>,
): ComponentType<P> {
  const Context = getContext(def)

  function WithProvider(props: P) {
    const [store] = useState(() => def.create())
    return (
      <Context.Provider value={store}>
        <WrappedComponent {...props} />
      </Context.Provider>
    )
  }

  WithProvider.displayName = `withProvider(${WrappedComponent.displayName ?? WrappedComponent.name ?? 'Component'})`
  return WithProvider
}

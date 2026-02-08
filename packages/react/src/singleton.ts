// @hurum/react — Singleton management
// Manages per-StoreDefinition singleton instances and React contexts

import { createContext } from 'react'
import type { StoreDefinition, StoreInstance } from '@hurum/core'

const IS_DEV = typeof globalThis !== 'undefined'
  && typeof (globalThis as { process?: { env?: Record<string, string> } }).process !== 'undefined'
  && (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.['NODE_ENV'] !== 'production'

// WeakMaps keyed by StoreDefinition for per-store metadata
const singletonMap = new WeakMap<StoreDefinition, StoreInstance>()
const contextMap = new WeakMap<StoreDefinition, React.Context<StoreInstance | null>>()

/** Stable context that always returns null — used when useStore receives an instance directly */
export const NULL_CONTEXT = createContext<StoreInstance | null>(null)

/**
 * Get or create the singleton instance for a StoreDefinition.
 * Warns in dev mode if called on the server.
 */
export function getSingleton(def: StoreDefinition): StoreInstance {
  let instance = singletonMap.get(def)
  if (!instance) {
    if (IS_DEV && typeof window === 'undefined') {
      console.warn(
        '[hurum/react] Singleton accessed on the server. Use Provider + Store.create() for SSR.',
      )
    }
    instance = def.create()
    singletonMap.set(def, instance)
  }
  return instance
}

/**
 * Get or create the React Context for a StoreDefinition.
 * Each StoreDefinition gets its own Context.
 */
export function getContext(def: StoreDefinition): React.Context<StoreInstance | null> {
  let ctx = contextMap.get(def)
  if (!ctx) {
    ctx = createContext<StoreInstance | null>(null)
    contextMap.set(def, ctx)
  }
  return ctx
}

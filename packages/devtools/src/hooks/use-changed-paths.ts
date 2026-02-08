import { useEffect, useRef } from 'react'

/**
 * Returns a Set of dot-paths that changed between the previous and current state.
 * Uses useEffect for ref update to be Strict Mode safe.
 */
export function useChangedPaths(state: Record<string, unknown> | null): Set<string> {
  const prevRef = useRef<Record<string, unknown> | null>(null)
  const prev = prevRef.current

  // Update ref in effect (after commit), NOT during render — Strict Mode safe
  useEffect(() => {
    prevRef.current = state
  })

  if (!prev || !state || prev === state) return new Set()

  const changed = new Set<string>()
  collectChanges(prev, state, '', changed, 0)
  return changed
}

function collectChanges(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  prefix: string,
  changed: Set<string>,
  depth: number,
): void {
  if (depth > 10) return

  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)])
  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key
    const pv = prev[key]
    const nv = next[key]

    if (pv === nv) continue
    if (deepEqual(pv, nv)) continue

    changed.add(path)

    // Recurse into plain objects
    if (
      pv !== null && nv !== null &&
      typeof pv === 'object' && typeof nv === 'object' &&
      !Array.isArray(pv) && !Array.isArray(nv)
    ) {
      collectChanges(
        pv as Record<string, unknown>,
        nv as Record<string, unknown>,
        path,
        changed,
        depth + 1,
      )
    }

    // Recurse into arrays — drill into changed elements
    if (Array.isArray(pv) && Array.isArray(nv)) {
      const maxLen = Math.max(pv.length, nv.length)
      for (let i = 0; i < maxLen; i++) {
        const ev = pv[i]
        const en = nv[i]
        if (ev === en) continue
        if (deepEqual(ev, en)) continue
        const elemPath = `${path}.${i}`
        changed.add(elemPath)
        // Recurse into object elements
        if (
          ev !== null && ev !== undefined &&
          en !== null && en !== undefined &&
          typeof ev === 'object' && typeof en === 'object' &&
          !Array.isArray(ev) && !Array.isArray(en)
        ) {
          collectChanges(
            ev as Record<string, unknown>,
            en as Record<string, unknown>,
            elemPath,
            changed,
            depth + 1,
          )
        }
      }
    }
  }
}

/** Shallow-ish deep equal for cloned state values */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return false
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return false

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  if (Array.isArray(a) || Array.isArray(b)) return false

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const aKeys = Object.keys(aObj)
  const bKeys = Object.keys(bObj)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    if (!deepEqual(aObj[key], bObj[key])) return false
  }
  return true
}

export interface DiffEntry {
  path: string
  prevValue: unknown
  nextValue: unknown
  /** True when array element content changed (don't show prev→next, just "modified") */
  modified?: boolean
}

/**
 * Compute a flat list of actually changed paths between two state objects.
 * Recurses into objects. Arrays: report length + changed indices (no deep recurse into elements).
 */
export function computeStateDiff(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): DiffEntry[] {
  const result: DiffEntry[] = []
  walkObject(prev, next, '', result, 0)
  return result
}

function walkObject(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  prefix: string,
  result: DiffEntry[],
  depth: number,
): void {
  if (depth > 8) return

  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)])
  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key
    walkValue(prev[key], next[key], path, result, depth)
  }
}

function walkValue(
  pv: unknown,
  nv: unknown,
  path: string,
  result: DiffEntry[],
  depth: number,
): void {
  if (depth > 8) return
  if (pv === nv) return
  if (deepEqual(pv, nv)) return

  // Both plain objects → recurse into fields
  if (
    pv !== null && nv !== null &&
    typeof pv === 'object' && typeof nv === 'object' &&
    !Array.isArray(pv) && !Array.isArray(nv)
  ) {
    walkObject(
      pv as Record<string, unknown>,
      nv as Record<string, unknown>,
      path,
      result,
      depth + 1,
    )
    return
  }

  // Both arrays → summarize: length change + which indices changed (no deep recurse)
  if (Array.isArray(pv) && Array.isArray(nv)) {
    if (pv.length !== nv.length) {
      result.push({ path: `${path}.length`, prevValue: pv.length, nextValue: nv.length })
    }
    const minLen = Math.min(pv.length, nv.length)
    for (let i = 0; i < minLen; i++) {
      if (!deepEqual(pv[i], nv[i])) {
        result.push({ path: `${path}[${i}]`, prevValue: pv[i], nextValue: nv[i], modified: true })
      }
    }
    for (let i = pv.length; i < nv.length; i++) {
      result.push({ path: `${path}[${i}]`, prevValue: undefined, nextValue: nv[i] })
    }
    for (let i = nv.length; i < pv.length; i++) {
      result.push({ path: `${path}[${i}]`, prevValue: pv[i], nextValue: undefined })
    }
    return
  }

  // Leaf value
  result.push({ path, prevValue: pv, nextValue: nv })
}

/** Deep equality for cloned state values */
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

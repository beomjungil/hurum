// @hurum/core — Computed

/** Internal representation of a resolved computed field */
export interface ComputedNode<T = unknown> {
  readonly name: string
  fn: (state: Record<string, unknown>) => T
  deps: Set<string>
  value: T
  prevValue: T
}

/**
 * Create a dependency-tracking proxy for the raw state.
 * Records which properties are accessed during computed evaluation.
 */
export function createTrackingProxy<T extends Record<string, unknown>>(
  state: T,
  accessed: Set<string>,
): T {
  return new Proxy(state, {
    get(target, prop, receiver) {
      if (typeof prop === 'string') {
        accessed.add(prop)
      }
      return Reflect.get(target, prop, receiver)
    },
  })
}

/**
 * Initialize computed nodes from a computed definition map.
 * Returns nodes in topological order for evaluation.
 */
export function initializeComputedNodes(
  rawState: Record<string, unknown>,
  computedDef: Record<string, (state: Record<string, unknown>) => unknown> | undefined,
): ComputedNode[] {
  if (!computedDef) return []

  const nodes: ComputedNode[] = []
  const nodesByName = new Map<string, ComputedNode>()

  // Evaluate each computed and track dependencies
  for (const [name, fn] of Object.entries(computedDef)) {
    const accessed = new Set<string>()
    const trackingProxy = createTrackingProxy(rawState, accessed)
    const value = fn(trackingProxy)

    const node: ComputedNode = {
      name,
      fn,
      deps: accessed,
      value,
      prevValue: value,
    }
    nodes.push(node)
    nodesByName.set(name, node)
  }

  // Check for cycles via topological sort
  const sorted = topologicalSort(nodes, nodesByName)

  return sorted
}

/**
 * Topological sort of computed nodes. Throws on cycle detection.
 */
function topologicalSort(
  nodes: ComputedNode[],
  nodesByName: Map<string, ComputedNode>,
): ComputedNode[] {
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const sorted: ComputedNode[] = []

  function visit(node: ComputedNode): void {
    if (visited.has(node.name)) return
    if (visiting.has(node.name)) {
      throw new Error(
        `Circular dependency detected in computed fields: ${node.name}`,
      )
    }

    visiting.add(node.name)

    // Visit dependencies that are also computed nodes
    for (const dep of node.deps) {
      const depNode = nodesByName.get(dep)
      if (depNode) {
        visit(depNode)
      }
    }

    visiting.delete(node.name)
    visited.add(node.name)
    sorted.push(node)
  }

  for (const node of nodes) {
    visit(node)
  }

  return sorted
}

/**
 * Re-evaluate computed nodes based on state changes.
 * Returns the new computed values and whether any changed.
 */
export function evaluateComputedNodes(
  nodes: ComputedNode[],
  rawState: Record<string, unknown>,
  changedKeys: Set<string>,
): { values: Record<string, unknown>; changed: boolean } {
  const values: Record<string, unknown> = {}
  let anyChanged = false

  for (const node of nodes) {
    // Check if any dependency changed
    let needsReeval = false
    for (const dep of node.deps) {
      if (changedKeys.has(dep)) {
        needsReeval = true
        break
      }
    }

    if (needsReeval) {
      // Re-evaluate with fresh tracking
      const accessed = new Set<string>()
      const trackingProxy = createTrackingProxy(rawState, accessed)
      const newValue = node.fn(trackingProxy)

      // Update deps
      node.deps = accessed

      // Structural equality check
      if (!structuralEqual(node.value, newValue)) {
        node.prevValue = node.value
        node.value = newValue
        anyChanged = true
        changedKeys.add(node.name) // Propagate to dependent computed nodes
      }
    }

    values[node.name] = node.value
  }

  return { values, changed: anyChanged }
}

/**
 * Simple structural equality check.
 * Handles primitives, arrays, and plain objects.
 */
export function structuralEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return false
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return false

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!structuralEqual(a[i], b[i])) return false
    }
    return true
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false

  const keysA = Object.keys(a as object)
  const keysB = Object.keys(b as object)
  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (!structuralEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false
  }

  return true
}

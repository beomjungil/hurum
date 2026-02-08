import { TreeNode } from './tree-node'

interface JsonTreeProps {
  data: Record<string, unknown>
  computedKeys?: ReadonlySet<string>
  nestedKeys?: ReadonlyMap<string, 'single' | 'array' | 'map'>
  changedPaths?: Set<string>
}

export function JsonTree({ data, computedKeys, nestedKeys, changedPaths }: JsonTreeProps) {
  return (
    <div>
      {Object.entries(data).map(([key, value]) => (
        <TreeNode
          key={key}
          label={key}
          value={value}
          depth={0}
          defaultExpanded
          isComputed={computedKeys?.has(key)}
          nestedKind={nestedKeys?.get(key)}
          path={key}
          changedPaths={changedPaths}
        />
      ))}
    </div>
  )
}

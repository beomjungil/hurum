import { LabelSchema, type Label } from '../../domain/entities/label'

export function parseLabel(raw: unknown): Label {
  return LabelSchema.parse(raw)
}

export function parseLabels(raw: unknown): Label[] {
  if (!Array.isArray(raw)) return []
  return raw.map(parseLabel)
}

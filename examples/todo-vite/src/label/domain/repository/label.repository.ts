import type { Label } from '../entities/label'

export interface LabelRepository {
  findAll(): Promise<Label[]>
  save(label: Label): Promise<Label>
  remove(id: string): Promise<void>
}

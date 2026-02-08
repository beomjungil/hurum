import type { Label } from '../../domain/entities/label'
import type { LabelRepository } from '../../domain/repository/label.repository'
import { parseLabels } from '../converters/label.converter'

const STORAGE_KEY = 'hurum-labels'

export class LabelRepositoryLocal implements LabelRepository {
  async findAll(): Promise<Label[]> {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return parseLabels(JSON.parse(raw))
  }

  async save(label: Label): Promise<Label> {
    const all = await this.findAll()
    const index = all.findIndex((l) => l.id === label.id)
    if (index >= 0) {
      all[index] = label
    } else {
      all.push(label)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    return label
  }

  async remove(id: string): Promise<void> {
    const all = await this.findAll()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.filter((l) => l.id !== id)))
  }
}

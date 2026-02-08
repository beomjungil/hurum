import type { Label } from '../../domain/entities/label'
import type { LabelRepository } from '../../domain/repository/label.repository'

export class LabelRepositoryMemory implements LabelRepository {
  private items: Label[] = []

  async findAll(): Promise<Label[]> {
    return [...this.items]
  }

  async save(label: Label): Promise<Label> {
    const index = this.items.findIndex((l) => l.id === label.id)
    if (index >= 0) {
      this.items[index] = label
    } else {
      this.items.push(label)
    }
    return label
  }

  async remove(id: string): Promise<void> {
    this.items = this.items.filter((l) => l.id !== id)
  }
}

/**
 * Bounded circular buffer that keeps the last N items.
 * Oldest items are evicted when the buffer is full.
 */
export class EventBuffer<T> {
  private buffer: (T | undefined)[]
  private head = 0
  private _size = 0

  constructor(private readonly capacity: number) {
    this.buffer = new Array(capacity)
  }

  push(item: T): void {
    this.buffer[this.head] = item
    this.head = (this.head + 1) % this.capacity
    if (this._size < this.capacity) this._size++
  }

  /** Returns all items in chronological order (oldest first). */
  getAll(): readonly T[] {
    if (this._size === 0) return []
    if (this._size < this.capacity) {
      return this.buffer.slice(0, this._size) as T[]
    }
    // Buffer has wrapped: [head..capacity) + [0..head)
    return [
      ...this.buffer.slice(this.head, this.capacity),
      ...this.buffer.slice(0, this.head),
    ] as T[]
  }

  clear(): void {
    this.buffer = new Array(this.capacity)
    this.head = 0
    this._size = 0
  }

  get size(): number {
    return this._size
  }
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private next: () => number;

  constructor(seed = Date.now()) {
    this.next = mulberry32(seed);
  }

  random(): number {
    return this.next();
  }

  int(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  range(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  chance(probability: number): boolean {
    return this.random() < probability;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.random() * items.length)];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  weighted<T>(items: readonly { item: T; weight: number }[]): T | null {
    const total = items.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
    if (total <= 0) return null;
    let roll = this.random() * total;
    for (const entry of items) {
      roll -= Math.max(0, entry.weight);
      if (roll <= 0) return entry.item;
    }
    return items[items.length - 1]?.item ?? null;
  }
}

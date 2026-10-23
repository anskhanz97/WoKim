import { describe, expect, it } from 'vitest';
import { packBubbles } from './bubble-layout';

describe('packBubbles', () => {
  it('keeps a representative project set inside the field without overlap', () => {
    const result = packBubbles(
      Array.from({ length: 12 }, (_, index) => ({ id: String(index), weight: index + 1 })),
      1100,
      650,
    );
    for (const bubble of result) {
      expect(bubble.x).toBeGreaterThanOrEqual(0);
      expect(bubble.y).toBeGreaterThanOrEqual(0);
      expect(bubble.x + bubble.diameter).toBeLessThanOrEqual(1100);
      expect(bubble.y + bubble.diameter).toBeLessThanOrEqual(650);
    }
    for (let left = 0; left < result.length; left += 1) {
      for (let right = left + 1; right < result.length; right += 1) {
        const a = result[left];
        const b = result[right];
        const distance = Math.hypot(
          a.x + a.diameter / 2 - (b.x + b.diameter / 2),
          a.y + a.diameter / 2 - (b.y + b.diameter / 2),
        );
        expect(distance).toBeGreaterThanOrEqual((a.diameter + b.diameter) / 2 - 1);
      }
    }
  });

  it('keeps a large collection bounded on a narrow field', () => {
    const started = performance.now();
    const result = packBubbles(
      Array.from({ length: 100 }, (_, index) => ({ id: String(index), weight: (index % 12) + 1 })),
      390,
      530,
    );
    expect(result).toHaveLength(100);
    expect(performance.now() - started).toBeLessThan(2000);
    for (const bubble of result) {
      expect(bubble.x).toBeGreaterThanOrEqual(0);
      expect(bubble.y).toBeGreaterThanOrEqual(0);
      expect(bubble.x + bubble.diameter).toBeLessThanOrEqual(390);
      expect(bubble.y + bubble.diameter).toBeLessThanOrEqual(530);
    }
    for (let left = 0; left < result.length; left += 1) {
      for (let right = left + 1; right < result.length; right += 1) {
        const a = result[left], b = result[right];
        const distance = Math.hypot(a.x + a.diameter / 2 - b.x - b.diameter / 2, a.y + a.diameter / 2 - b.y - b.diameter / 2);
        expect(distance + 0.1).toBeGreaterThanOrEqual((a.diameter + b.diameter) / 2);
      }
    }
  });
});

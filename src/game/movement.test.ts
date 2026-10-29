import { describe, expect, it } from 'vitest';
import { bobOffset, clampToBounds, normalizeMoveVector } from './movement';

describe('normalizeMoveVector', () => {
  it('ignores idle and sub-deadzone input', () => {
    expect(normalizeMoveVector(0, 0)).toEqual({ x: 0, y: 0, magnitude: 0 });
    expect(normalizeMoveVector(0.04, -0.04)).toEqual({ x: 0, y: 0, magnitude: 0 });
  });

  it('keeps cardinal movement at unit speed', () => {
    expect(normalizeMoveVector(1, 0)).toEqual({ x: 1, y: 0, magnitude: 1 });
    expect(normalizeMoveVector(-1, 0)).toEqual({ x: -1, y: 0, magnitude: 1 });
    expect(normalizeMoveVector(0, 1)).toEqual({ x: 0, y: 1, magnitude: 1 });
  });

  it('normalizes diagonal movement so it is not faster than cardinal movement', () => {
    const diagonal = normalizeMoveVector(1, 1);
    expect(diagonal.x).toBeCloseTo(Math.SQRT1_2);
    expect(diagonal.y).toBeCloseTo(Math.SQRT1_2);
    expect(diagonal.magnitude).toBe(1);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
  });

  it('normalizes combined keyboard + joystick input', () => {
    const combined = normalizeMoveVector(1.6, 1.2);
    expect(combined.magnitude).toBe(1);
    expect(Math.hypot(combined.x, combined.y)).toBeCloseTo(1);
  });

  it('preserves a partial joystick tilt', () => {
    const gentle = normalizeMoveVector(0.5, 0);
    expect(gentle.x).toBe(0.5);
    expect(gentle.y).toBe(0);
    expect(gentle.magnitude).toBe(0.5);
  });

  it('cancels zeroed opposing input and rejects invalid values', () => {
    expect(normalizeMoveVector(0, 0)).toEqual({ x: 0, y: 0, magnitude: 0 });
    expect(normalizeMoveVector(Number.NaN, 0)).toEqual({ x: 0, y: 0, magnitude: 0 });
    expect(normalizeMoveVector(0, Number.POSITIVE_INFINITY)).toEqual({ x: 0, y: 0, magnitude: 0 });
  });
});

describe('clampToBounds', () => {
  const bounds = { minX: 44, minY: 84, maxX: 2556, maxY: 1956 };

  it('leaves positions inside the playable area untouched', () => {
    expect(clampToBounds(1300, 1000, bounds)).toEqual({ x: 1300, y: 1000 });
  });

  it('clamps every edge independently', () => {
    expect(clampToBounds(-10, 1000, bounds)).toEqual({ x: 44, y: 1000 });
    expect(clampToBounds(9999, 1000, bounds)).toEqual({ x: 2556, y: 1000 });
    expect(clampToBounds(1300, 0, bounds)).toEqual({ x: 1300, y: 84 });
    expect(clampToBounds(1300, 9999, bounds)).toEqual({ x: 1300, y: 1956 });
    expect(clampToBounds(-1, 9999, bounds)).toEqual({ x: 44, y: 1956 });
  });
});

describe('bobOffset', () => {
  it('returns a small non-net-zero render offset for walking', () => {
    const offsets = [0, 0.1, 0.2, 0.3, 0.4].map((clock) => bobOffset(true, clock, 0));
    expect(Math.min(...offsets)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...offsets)).toBeLessThanOrEqual(2.4);
    expect(offsets.some((offset) => offset > 0)).toBe(true);
  });

  it('keeps the idle sway within one pixel', () => {
    for (let time = 0; time < 4000; time += 125) {
      const offset = bobOffset(false, 0, time);
      expect(Math.abs(offset)).toBeLessThanOrEqual(0.8);
    }
  });
});

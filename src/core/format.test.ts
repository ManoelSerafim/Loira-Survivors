import { describe, expect, it } from 'vitest';
import { clamp, formatDecimal, formatNumber, formatTime, pct, plural } from './format';

describe('format helpers', () => {
  it('formats whole numbers using Brazilian grouping', () => {
    expect(formatNumber(1234)).toBe('1.234');
    expect(formatNumber(999.9)).toBe('999');
  });

  it('formats decimals with a comma and fixed precision', () => {
    expect(formatDecimal(1.5)).toBe('1,50');
    expect(formatDecimal(1.234, 1)).toBe('1,2');
    expect(formatDecimal(0)).toBe('0,00');
  });

  it('uses singular and plural labels', () => {
    expect(plural(0, 'jornada', 'jornadas')).toBe('0 jornadas');
    expect(plural(1, 'jornada', 'jornadas')).toBe('1 jornada');
    expect(plural(2, 'jornada', 'jornadas')).toBe('2 jornadas');
  });

  it('formats timers and percentages', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(59.2)).toBe('01:00');
    expect(pct(0.734)).toBe('73%');
  });

  it('clamps values to a range', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-2, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});

export const INPUT_DEADZONE = 0.08;

export interface MoveInput {
  x: number;
  y: number;
}

export interface MoveVector {
  x: number;
  y: number;
  magnitude: number;
}

export interface MoveBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Combines keyboard axes (-1, 0 or 1) with the analog virtual joystick.
 * A sub-unit analog magnitude is preserved, but the result never exceeds
 * unit length. That keeps diagonal movement exactly as fast as cardinal
 * movement while still allowing a half-tilted joystick to walk slower.
 */
export function normalizeMoveVector(x: number, y: number, deadzone = INPUT_DEADZONE): MoveVector {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: 0, y: 0, magnitude: 0 };
  const length = Math.hypot(x, y);
  if (length <= deadzone) return { x: 0, y: 0, magnitude: 0 };
  const scale = length > 1 ? 1 / length : 1;
  return { x: x * scale, y: y * scale, magnitude: Math.min(1, length) };
}

export function clampToBounds(x: number, y: number, bounds: MoveBounds): MoveInput {
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, y)),
  };
}

/**
 * Height of the visual walk/idle bob. This is a render offset only: it must
 * never be added to the logical player position, otherwise the sprite itself
 * drifts every frame.
 */
export function bobOffset(moving: boolean, walkClock: number, timeMs: number): number {
  return moving
    ? Math.abs(Math.sin(walkClock * 12)) * 2.4
    : Math.sin(timeMs * 0.0025) * 0.8;
}

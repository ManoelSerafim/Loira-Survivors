export interface VirtualInput {
  x: number;
  y: number;
  active: boolean;
}

/**
 * Shared between the DOM joystick and the Phaser scene. Values are in the
 * [-1, 1] range and are consumed by GameScene every frame.
 */
export const gameInput: VirtualInput = {
  x: 0,
  y: 0,
  active: false,
};

let enabled = true;

/**
 * The joystick is a DOM element and keeps receiving pointer events while the
 * Phaser scene is paused. Disabling it prevents a held/dragged stick from
 * leaving stale movement input that is applied as soon as the run resumes.
 */
export function setVirtualInputEnabled(value: boolean): void {
  enabled = value;
  if (!enabled) clearVirtualInput();
}

export function isVirtualInputEnabled(): boolean {
  return enabled;
}

export function setVirtualInput(x: number, y: number): void {
  if (!enabled) {
    clearVirtualInput();
    return;
  }
  const length = Math.hypot(x, y);
  if (length > 1) {
    x /= length;
    y /= length;
  }
  gameInput.x = x;
  gameInput.y = y;
  gameInput.active = Math.abs(x) > 0.04 || Math.abs(y) > 0.04;
}

export function clearVirtualInput(): void {
  gameInput.x = 0;
  gameInput.y = 0;
  gameInput.active = false;
}

export interface RoomRegistryEntry {
  roomId: string;
  roomCode: string;
  started: boolean;
}

const roomByCode = new Map<string, RoomRegistryEntry>();

export function registerRoom(entry: RoomRegistryEntry): void {
  roomByCode.set(entry.roomCode, entry);
}

export function removeRoom(code: string): void {
  roomByCode.delete(code);
}

export function setRoomStarted(code: string, started: boolean): void {
  const current = roomByCode.get(code);
  if (!current) return;
  roomByCode.set(code, { ...current, started });
}

export function findRoomByCode(code: string): RoomRegistryEntry | null {
  return roomByCode.get(code) ?? null;
}

export function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 12; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    if (!roomByCode.has(code)) return code;
  }
  throw new Error('Nao foi possivel gerar codigo de sala unico.');
}

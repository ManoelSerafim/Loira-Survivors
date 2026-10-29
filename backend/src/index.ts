import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import { CoopRoom, resolveRoomIdByCode } from './rooms/CoopRoom.js';

const PORT = Number(process.env.PORT ?? 2567);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'loira-survivors-multiplayer' });
});

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define('coop_room', CoopRoom);

app.post('/api/rooms/resolve', (req, res) => {
  const roomCode = typeof req.body?.roomCode === 'string' ? req.body.roomCode : '';
  const roomId = resolveRoomIdByCode(roomCode);
  if (!roomId) {
    res.status(404).json({ ok: false, error: 'ROOM_NOT_FOUND_OR_STARTED' });
    return;
  }
  res.json({ ok: true, roomId });
});

app.use('/colyseus', monitor());

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Multiplayer server listening on http://0.0.0.0:${PORT}`);
});

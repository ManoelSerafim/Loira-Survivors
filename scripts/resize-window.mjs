import process from 'node:process';

const [widthArg, heightArg] = process.argv.slice(2);
const width = Number(widthArg ?? 1600);
const height = Number(heightArg ?? 1000);
if (!width || !height) {
  console.error('Usage: node scripts/resize-window.mjs <width> <height>');
  process.exit(1);
}

const version = await fetch('http://localhost:9222/json/version').then((response) => response.json());
const targets = await fetch('http://localhost:9222/json').then((response) => response.json());
const page = targets.find((target) => target.type === 'page' && target.url.startsWith('http://localhost:5173'));
if (!page) {
  console.error('No localhost:5173 page target found.');
  process.exit(1);
}

const ws = new WebSocket(version.webSocketDebuggerUrl);
let nextId = 0;
const pending = new Map();

ws.addEventListener('message', (message) => {
  const payload = JSON.parse(message.data);
  if (!payload.id) return;
  const entry = pending.get(payload.id);
  if (!entry) return;
  pending.delete(payload.id);
  if (payload.error) entry.reject(new Error(payload.error.message));
  else entry.resolve(payload.result);
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

const { windowId } = await send('Browser.getWindowForTarget', { targetId: page.id });
await send('Browser.setWindowBounds', { windowId, bounds: { width, height, windowState: 'normal' } });
console.log(`Window resized to ${width}x${height}.`);
ws.close();

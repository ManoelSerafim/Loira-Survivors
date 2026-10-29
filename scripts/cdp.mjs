import fs from 'node:fs';
import path from 'node:path';

const endpoint = process.env.CDP_ENDPOINT ?? 'http://localhost:9222/json';
const targets = await fetch(endpoint).then((response) => response.json());
const page = targets.find((target) => target.type === 'page' && target.url.startsWith('http://localhost:5173'));
if (!page) {
  console.error('No localhost:5173 page target found.');
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let nextId = 0;
const pending = new Map();
const events = [];
const waiters = [];

ws.addEventListener('message', (message) => {
  const payload = JSON.parse(message.data);
  if (payload.id) {
    const entry = pending.get(payload.id);
    if (!entry) return;
    pending.delete(payload.id);
    if (payload.error) entry.reject(new Error(payload.error.message));
    else entry.resolve(payload.result);
    return;
  }
  events.push(payload);
  for (const waiter of [...waiters]) {
    if (waiter.method === payload.method) {
      waiters.splice(waiters.indexOf(waiter), 1);
      clearTimeout(waiter.timer);
      waiter.resolve(payload.params);
    }
  }
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function waitForEvent(method, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const waiter = { method, resolve, reject, timer: null };
    waiter.timer = setTimeout(() => {
      const index = waiters.indexOf(waiter);
      if (index >= 0) waiters.splice(index, 1);
      reject(new Error(`Timed out waiting for ${method}`));
    }, timeout);
    waiters.push(waiter);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatEvent(event) {
  if (event.method === 'Runtime.exceptionThrown') {
    const details = event.params.exceptionDetails;
    return `EXCEPTION: ${details.text} ${details.exception?.description ?? ''}`.trim();
  }
  if (event.method === 'Log.entryAdded') {
    const entry = event.params.entry;
    return `LOG[${entry.level}] ${entry.source}: ${entry.text}`;
  }
  if (event.method === 'Runtime.consoleAPICalled') {
    const args = event.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ');
    return `CONSOLE[${event.params.type}]: ${args}`;
  }
  return null;
}

function printEvents() {
  const relevant = events.map(formatEvent).filter(Boolean);
  if (relevant.length) {
    console.log(relevant.join('\n'));
  } else {
    console.log('No console messages or exceptions captured.');
  }
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) {
    console.error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result?.value;
}

function parseSize(value) {
  const [width, height] = value.split('x').map(Number);
  if (!width || !height) throw new Error('Size must look like 1600x1000.');
  return { width, height };
}

async function screenshot(file) {
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const target = path.resolve(file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.from(result.data, 'base64'));
  console.log(`Screenshot: ${target}`);
}

await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');

const [command, ...args] = process.argv.slice(2);

try {
  switch (command) {
    case 'audit': {
      const load = waitForEvent('Page.loadEventFired');
      await send('Page.reload', { ignoreCache: true });
      await load.catch(() => undefined);
      await sleep(1400);
      printEvents();
      const info = await evaluate(`({
        title: document.title,
        screen: document.querySelector('#ui-root')?.dataset.screen,
        bodyText: document.body.innerText.slice(0, 800),
        size: { w: innerWidth, h: innerHeight },
        errors: performance.getEntriesByType('resource').filter(r => r.name.includes('/src/')).length
      })`);
      console.log(JSON.stringify(info, null, 2));
      if (args[0]) await screenshot(args[0]);
      break;
    }
    case 'shot':
      await screenshot(args[0] ?? 'screenshot.png');
      break;
    case 'eval': {
      const value = await evaluate(args.join(' '));
      console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
      break;
    }
    case 'click': {
      const selector = JSON.stringify(args[0]);
      const value = await evaluate(`(() => { const el = document.querySelector(${selector}); if (!el) return 'NOT FOUND'; el.click(); return el.tagName + ':' + (el.textContent || '').trim().slice(0, 80); })()`);
      console.log(value);
      break;
    }
    case 'wait':
      await sleep(Number(args[0] ?? 500));
      break;
    case 'size':
      await send('Emulation.setDeviceMetricsOverride', {
        ...parseSize(args[0]),
        deviceScaleFactor: Number(args[1] ?? 1),
        mobile: args[2] === 'mobile',
      });
      console.log(`Viewport: ${args[0]}`);
      break;
    case 'reset':
      await send('Emulation.clearDeviceMetricsOverride');
      console.log('Viewport override cleared.');
      break;
    case 'reload': {
      const load = waitForEvent('Page.loadEventFired');
      await send('Page.reload', { ignoreCache: true });
      await load.catch(() => undefined);
      await sleep(Number(args[0] ?? 700));
      printEvents();
      console.log('Reloaded.');
      break;
    }
    case 'html': {
      const value = await evaluate(`document.querySelector(${JSON.stringify(args[0])})?.outerHTML ?? 'NOT FOUND'`);
      console.log(value);
      break;
    }
    case 'help':
    default:
      console.log('Commands: audit [file] | shot <file> | eval <expression> | click <selector> | wait <ms> | size <w>x<h> [scale] [mobile] | reset | reload [ms] | html <selector>');
  }
} finally {
  ws.close();
}

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { buildInstructions, generateReply, parseConversation } from './chat-core.mjs';

const root = new URL('./', import.meta.url);
const page = await readFile(new URL('index.html', root), 'utf8');
const instructions = buildInstructions(page);

const port = Number(process.env.PORT || 8767);
const host = process.env.HOST || '127.0.0.1';
const apiOnly = process.env.CHAT_API_ONLY === '1';
const provider = process.env.CHAT_PROVIDER || 'gemini';
if (!['gemini', 'openai'].includes(provider)) throw new Error('Unsupported CHAT_PROVIDER.');
const gemini = provider === 'gemini';
const key = gemini ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
const model = gemini ? process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'
  : process.env.OPENAI_MODEL || 'gpt-5-mini';
const allowedOrigins = new Set([
  'https://zuhairqr.github.io',
  `http://127.0.0.1:${port}`, `http://localhost:${port}`,
  'http://127.0.0.1:8766', 'http://localhost:8766',
  ...((process.env.CHAT_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)),
]);
const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/assets/portfolio.js', ['assets/portfolio.js', 'text/javascript; charset=utf-8']],
  ['/assets/scene.js', ['assets/scene.js', 'text/javascript; charset=utf-8']],
  ['/assets/zuhair-ahmed-cyberpunk.jpg', ['assets/zuhair-ahmed-cyberpunk.jpg', 'image/jpeg']],
  ['/assets/zuhair-editorial-portrait.jpg', ['assets/zuhair-editorial-portrait.jpg', 'image/jpeg']],
  ['/assets/zuhair-developer-workspace.jpg', ['assets/zuhair-developer-workspace.jpg', 'image/jpeg']],
]);
const requestTimes = new Map();
let budget = { day: '', requests: 0 };
let inFlight = 0;

function json(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}

function reserveRequest(ip) {
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  if (budget.day !== day) budget = { day, requests: 0 };
  for (const [address, entry] of requestTimes) {
    if (entry.reset <= now) requestTimes.delete(address);
  }
  const entry = requestTimes.get(ip) ?? { reset: now + 60_000, requests: 0 };
  if (entry.requests >= 8 || budget.requests >= 200 || inFlight >= 4) return false;
  entry.requests++;
  budget.requests++;
  requestTimes.set(ip, entry);
  return true;
}

async function readMessages(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 65_536) {
      const error = new Error('Request too large');
      error.code = 'BODY_TOO_LARGE';
      throw error;
    }
    chunks.push(chunk);
  }
  return parseConversation(Buffer.concat(chunks).toString('utf8'));
}

async function chat(request, response) {
  if (!key) return json(response, 503, { error: 'AI chat is not configured on this server.' });
  let conversation;
  try {
    conversation = await readMessages(request);
  } catch (error) {
    return json(response, error.code === 'BODY_TOO_LARGE' ? 413 : 400, { error: 'The conversation could not be read.' });
  }
  if (!reserveRequest(request.socket.remoteAddress || 'unknown')) {
    return json(response, 429, { error: 'Chat is busy or has reached its request limit. Please try again later.' });
  }

  inFlight++;
  try {
    const result = await generateReply({ conversation, instructions, key, provider, model });
    return json(response, result.status, result.body);
  } finally {
    inFlight--;
  }
}

const server = createServer(async (request, response) => {
  const path = new URL(request.url || '/', 'http://localhost').pathname;
  if (path === '/healthz' && request.method === 'GET') {
    return json(response, 200, { status: 'ok' });
  }
  if (path === '/api/chat') {
    const origin = request.headers.origin;
    if (origin && !allowedOrigins.has(origin)) return json(response, 403, { error: 'Origin not allowed.' });
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204, { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
      return response.end();
    }
    if (request.method !== 'POST') return json(response, 405, { error: 'Use POST.' });
    if (!request.headers['content-type']?.startsWith('application/json')) {
      return json(response, 415, { error: 'Expected JSON.' });
    }
    return chat(request, response);
  }
  if (apiOnly) return json(response, 404, { error: 'Not found.' });
  const file = staticFiles.get(path);
  if (!file || !['GET', 'HEAD'].includes(request.method)) return json(response, 404, { error: 'Not found.' });
  try {
    const [name, type] = file;
    const content = name === 'index.html'
      ? (await readFile(new URL(name, root), 'utf8'))
        .replace('name="portfolio-chat-endpoint" content=""', 'name="portfolio-chat-endpoint" content="/api/chat"')
      : await readFile(new URL(name, root));
    response.writeHead(200, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    json(response, 404, { error: 'Not found.' });
  }
});
server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Choose a free PORT and open the URL printed when the server starts.`);
  } else {
    console.error(`Portfolio chat server could not listen: ${error.code || 'unknown error'}`);
  }
  process.exitCode = 1;
});
server.listen(port, host, () => console.log(`Portfolio chat server listening on http://${host}:${port}`));

import page from './index.html';
import { buildInstructions, generateReply, parseConversation } from './chat-core.mjs';

const instructions = buildInstructions(page);
const portfolioOrigin = 'https://zuhairqr.github.io';

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    const origin = request.headers.get('Origin');
    const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
    const json = (status, body) => Response.json(body, { status, headers });

    if (path === '/healthz' && request.method === 'GET') {
      return json(200, { status: 'ok', chatConfigured: Boolean(env.GEMINI_API_KEY) });
    }
    if (path !== '/api/chat') return json(404, { error: 'Not found.' });
    if (origin && origin !== portfolioOrigin) return json(403, { error: 'Origin not allowed.' });
    if (origin) headers.set('Access-Control-Allow-Origin', portfolioOrigin);
    if (request.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST') return json(405, { error: 'Use POST.' });
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
      return json(415, { error: 'Expected JSON.' });
    }
    if (!env.GEMINI_API_KEY) return json(503, { error: 'AI chat is not configured on this server.' });
    if (!request.body) return json(400, { error: 'The conversation could not be read.' });

    let conversation;
    try {
      const decoder = new TextDecoder();
      let bytes = 0;
      let text = '';
      for await (const chunk of request.body) {
        bytes += chunk.byteLength;
        if (bytes > 65_536) return json(413, { error: 'The conversation is too large.' });
        text += decoder.decode(chunk, { stream: true });
      }
      conversation = parseConversation(text + decoder.decode());
    } catch {
      return json(400, { error: 'The conversation could not be read.' });
    }

    const address = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!(await env.CHAT_LIMITER.limit({ key: address })).success) {
      return json(429, { error: 'Chat is busy. Please try again in a minute.' });
    }
    const result = await generateReply({
      conversation, instructions, key: env.GEMINI_API_KEY, model: env.GEMINI_MODEL,
    });
    return json(result.status, result.body);
  },
};

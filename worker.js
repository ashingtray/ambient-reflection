// ============================================================
// Ambient Reflection — FREE AI clean-up (Cloudflare Workers AI)
// ------------------------------------------------------------
// Runs an open model (Llama) on Cloudflare's free tier.
// No Anthropic key, no billing. Free: 10,000 neurons/day.
//
// SETUP:
// 1. In the Worker: Settings -> Bindings -> Add -> Workers AI.
//    Set the Variable name to exactly:  AI
// 2. Paste this file's contents into the Worker code -> Deploy.
// 3. In index.html set:
//      var AI_ENDPOINT='https://ambient-ai.<you>.workers.dev';
//    Re-upload index.html to GitHub.
// ============================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST') return new Response('POST only', { status: 405, headers: CORS });

    let userText = '';
    try {
      const body = await request.json();
      userText = (body.messages && body.messages[0] && body.messages[0].content) || '';
    } catch (e) {}
    if (!userText) return json({ content: [{ type: 'text', text: '' }] });

    try {
      const r = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role: 'user', content: userText }],
        max_tokens: 1024,
      });
      const out = (r && (r.response || r.result || '')) || '';
      return json({ content: [{ type: 'text', text: String(out).trim() }] });
    } catch (e) {
      // If the AI call fails (e.g. daily free limit reached), the app
      // falls back to its offline dictionary corrector on its own.
      return json({ error: String(e && e.message || e) }, 500);
    }
  },
};

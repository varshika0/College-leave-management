/* Campus Connect Worker: serves static assets + AI certificate verification.
   The AI key lives only here (Worker secret) — never in browser code. */

const DEFAULT_AI_BASE = 'https://freebuff.com/api/v1/paid';
const DEFAULT_MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are a forensic document examiner for a college leave portal.
You receive an image of a student leave certificate (medical certificate or on-duty/OD letter).
Assess its authenticity from visual evidence only.
Check: letterhead and institution-name consistency; seal/stamp and signature realism (placement, blur, colour mismatch, pasted-on look); typography problems (mixed fonts, misalignment, spacing, obvious font substitution); digital tampering (rectangular blur patches, cloned regions, mismatched compression/noise, edited text); date and content logic vs the application context provided; mass-template signs (generic wording, placeholder text); scan/photo quality anomalies.
Never invent evidence; if the image is unreadable say so.
Reply with STRICT JSON only, no prose, no markdown fences:
{"verdict":"likely_real"|"suspicious"|"likely_fake","confidence":<0-100 integer>,"reasons":["<short reason>","<short reason>"]}
Give 2-4 concise reasons a teacher can understand.`;

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (request.method === 'POST' && pathname === '/api/ai-check') return handleAiCheck(request, env);
    return env.ASSETS.fetch(request);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleAiCheck(request, env) {
  if (!env.OPENAI_API_KEY) {
    return json({ ok: false, code: 'no_key', error: 'AI key not configured on the server. The site owner must add the OPENAI_API_KEY secret.' }, 503);
  }
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'Bad request' }, 400); }

  const { image, context } = body || {};
  if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
    return json({ ok: false, code: 'bad_image', error: 'Expected a base64 image (data:image/...).' }, 400);
  }

  const base = (env.AI_API_BASE || DEFAULT_AI_BASE).replace(/\/+$/, '');
  const model = env.AI_MODEL || DEFAULT_MODEL;
  const c = context || {};
  const userText = `Certificate type: ${c.kind || 'unknown'}. Student: ${c.student || 'unknown'} (${c.dept || 'n/a'}). ` +
    `Stated leave reason: ${c.reason || 'n/a'}. Leave dates: ${c.from || 'n/a'} to ${c.to || 'n/a'}. ` +
    `File name: ${c.fileName || 'attachment'}. Assess the attached document image for authenticity.`;

  try {
    const url = `${base}/chat/completions`;
    const headers = {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    };
    const payload = {
      model,
      temperature: 0.1,
      max_completion_tokens: 450,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: image } }
          ]
        }
      ]
    };    let r = await fetch(url, {
      method: 'POST', headers, body: JSON.stringify(payload)
    });

    if (r.status === 400) {
      // Some providers reject response_format — retry without it
      const p2 = { ...payload };
      delete p2.response_format;
      r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(p2) });
    }

    // Free tiers throttle per minute — wait out the window and retry twice
    for (let attempt = 0; r.status === 429 && attempt < 2; attempt++) {
      let waitMs = 7000;
      try {
        const t = await r.clone().text();
        const m = t.match(/try again in ([0-9.]+)s/);
        if (m) waitMs = Math.min(30000, Math.ceil(parseFloat(m[1]) * 1000) + 1500);
      } catch {}
      await new Promise(res => setTimeout(res, waitMs));
      r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (r.status === 400) {
        const p2 = { ...payload };
        delete p2.response_format;
        r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(p2) });
      }
    }
    if (!r.ok) {
      let detail = '';
      try { detail = (await r.text()).slice(0, 300); } catch {}
      return json({ ok: false, code: 'provider_error', error: `AI provider error (HTTP ${r.status}).`, detail }, 502);
    }
    const data = await r.json();
    let content = data?.choices?.[0]?.message?.content || '';
    content = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    let parsed;
    try { parsed = JSON.parse(content); }
    catch { return json({ ok: false, code: 'bad_response', error: 'AI returned an unreadable response. Try again.' }, 502); }

    const allowed = ['likely_real', 'suspicious', 'likely_fake'];
    const verdict = allowed.includes(parsed.verdict) ? parsed.verdict : 'suspicious';
    const confidence = Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0)));
    const reasons = Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 5).map(String) : [];

    return json({ ok: true, verdict, confidence, reasons });
  } catch (err) {
    return json({ ok: false, code: 'network', error: 'Could not reach the AI provider.' }, 502);
  }
}

/*
 * Meta Conversions API (CAPI) — server-side odesílání eventů.
 *
 * Klient (landing.html, dekujeme.html) sem POSTuje event se stejným event_id,
 * jaké posílá browser Pixel (fbq) — Meta pak oba zdroje deduplikuje.
 * Server payload obohatí o IP, User-Agent a _fbp/_fbc cookies (lepší match rate).
 *
 * Env proměnné (Vercel → Settings → Environment Variables, lokálně .env):
 *   META_PIXEL_ID            — ID pixelu / datasetu
 *   META_CAPI_ACCESS_TOKEN   — access token pro CAPI (tajný, nikdy do gitu)
 *   META_CAPI_TEST_EVENT_CODE — jen pro testování (Test events v Events Manageru);
 *                               v produkci proměnnou nenastavuj / smaž.
 */

const crypto = require('crypto');

const GRAPH_API_VERSION = 'v21.0';

const ALLOWED_EVENTS = new Set(['Purchase', 'InitiateCheckout']);

// SHA-256 hash dle požadavků Mety: lowercase, trim, hex
function hash(value) {
  return crypto
    .createHash('sha256')
    .update(String(value).trim().toLowerCase())
    .digest('hex');
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || undefined;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) {
    return res.status(500).json({ error: 'Server není nakonfigurován (chybí env proměnné)' });
  }

  const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
  const { event_name, event_id, event_source_url, custom_data, email, fbclid, consent } = body;

  if (!ALLOWED_EVENTS.has(event_name)) {
    return res.status(400).json({ error: 'Nepovolený event_name' });
  }
  if (!event_id || typeof event_id !== 'string' || event_id.length > 128) {
    return res.status(400).json({ error: 'Chybí platné event_id' });
  }
  // Bez marketingového souhlasu event neposíláme (stejná logika jako browser Pixel)
  if (consent !== true) {
    return res.status(200).json({ skipped: 'no_consent' });
  }

  const cookies = parseCookies(req.headers.cookie);

  const userData = {
    client_ip_address: clientIp(req),
    client_user_agent: req.headers['user-agent'],
  };
  if (email) userData.em = [hash(email)];
  if (cookies._fbp) userData.fbp = cookies._fbp;
  if (cookies._fbc) {
    userData.fbc = cookies._fbc;
  } else if (fbclid && typeof fbclid === 'string' && fbclid.length < 512) {
    // _fbc cookie neexistuje, ale v URL byl fbclid → sestavíme fbc ručně
    userData.fbc = `fb.1.${Date.now()}.${fbclid}`;
  }

  const event = {
    event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id,
    action_source: 'website',
    event_source_url:
      typeof event_source_url === 'string' && event_source_url.startsWith('https://svetvyprav.cz')
        ? event_source_url
        : 'https://svetvyprav.cz/landing',
    user_data: userData,
  };

  if (custom_data && typeof custom_data === 'object') {
    event.custom_data = {
      currency: 'CZK',
      value: Number(custom_data.value) || 0,
      content_ids: Array.isArray(custom_data.content_ids)
        ? custom_data.content_ids.slice(0, 10).map(String)
        : undefined,
      content_type: 'product',
      content_name: typeof custom_data.content_name === 'string' ? custom_data.content_name : undefined,
    };
  }

  const payload = { data: [event] };
  if (process.env.META_CAPI_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_CAPI_TEST_EVENT_CODE;
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;
    const metaRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const metaJson = await metaRes.json();

    if (!metaRes.ok) {
      console.error('Meta CAPI error:', JSON.stringify(metaJson?.error || metaJson));
      return res.status(502).json({ error: 'Meta API odmítlo event' });
    }
    return res.status(200).json({ events_received: metaJson.events_received });
  } catch (err) {
    console.error('Meta CAPI request failed:', err.message);
    return res.status(502).json({ error: 'Odeslání na Meta selhalo' });
  }
};

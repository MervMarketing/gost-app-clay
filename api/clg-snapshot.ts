import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Same-origin proxy: browser → GOST /api/clg-snapshot → Snapshot /api/scan.
 * Avoids CORS. Set CLG_SNAPSHOT_URL on Vercel (server env, not VITE_*).
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const upstream = process.env.CLG_SNAPSHOT_URL?.trim();
  if (!upstream) {
    res.status(501).json({
      error:
        'CLG_SNAPSHOT_URL is not set on the server. In Vercel → Settings → Environment Variables, add CLG_SNAPSHOT_URL=https://your-snapshot-host (no /api/scan).',
    });
    return;
  }

  let body: { url?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body as { url?: string });
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const base = upstream.replace(/\/$/, '');
  const scanUrl = base.endsWith('/api/scan') ? base : `${base}/api/scan`;

  try {
    const r = await fetch(scanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    let data: unknown;
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { error: 'Snapshot returned non-JSON', detail: text.slice(0, 300) };
    }
    res.status(r.status).json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    res.status(502).json({
      error: 'Could not reach the Snapshot service from GOST. Check CLG_SNAPSHOT_URL and that Snapshot is deployed.',
      detail: msg,
    });
  }
}

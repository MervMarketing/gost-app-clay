import type { VercelRequest, VercelResponse } from '@vercel/node';

function formatUpstreamError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const parts: string[] = [err.message];
  let c: unknown = err.cause;
  for (let depth = 0; c != null && depth < 5; depth++) {
    if (c instanceof Error) {
      parts.push(c.message);
      c = c.cause;
    } else if (typeof c === 'object' && c !== null) {
      const o = c as Record<string, unknown>;
      if (o.code != null) parts.push(`code ${o.code}`);
      if (o.errno != null) parts.push(`errno ${o.errno}`);
      if (o.syscall != null) parts.push(String(o.syscall));
      break;
    } else {
      parts.push(String(c));
      break;
    }
  }
  return parts.filter(Boolean).join(' · ');
}

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

  let host: string;
  try {
    host = new URL(scanUrl).hostname;
  } catch {
    res.status(500).json({
      error:
        'CLG_SNAPSHOT_URL must be a full URL with https:// (example: https://your-snapshot.vercel.app).',
      detail: `Got: ${upstream.slice(0, 120)}`,
    });
    return;
  }

  try {
    const r = await fetch(scanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'GOST-clg-snapshot-proxy/1.0',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(110_000),
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
    const chain = formatUpstreamError(e);
    res.status(502).json({
      error: 'GOST could not connect to your Snapshot server.',
      detail: `${chain} · host: ${host} · path: /api/scan`,
      hint:
        'Use Quick estimate in GOST if you need a score without the live scanner. For Live scan: confirm the Snapshot app is deployed and healthy, POST /api/scan works (e.g. curl), TLS/DNS resolve from the public internet, and CLG_SNAPSHOT_URL on this Vercel project is the correct origin (no trailing /api/scan). Redeploy GOST after env changes.',
    });
  }
}

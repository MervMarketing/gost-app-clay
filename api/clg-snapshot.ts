import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runMervHomepageScan, ScanHttpError } from './lib/mervSnapshotEngine/runScan.js';

function readErrorCause(e: unknown): unknown {
  if (e && typeof e === 'object' && 'cause' in e) {
    return (e as { cause: unknown }).cause;
  }
  return undefined;
}

function formatUpstreamError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const parts: string[] = [err.message];
  let c: unknown = readErrorCause(err);
  for (let depth = 0; c != null && depth < 5; depth++) {
    if (c instanceof Error) {
      parts.push(c.message);
      c = readErrorCause(c);
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
 * CLG live homepage scan:
 * 1. If `ANTHROPIC_API_KEY` is set — runs the built-in engine (same rubric as clg-snapshot).
 * 2. Else if `CLG_SNAPSHOT_URL` is set — proxies to external Snapshot (legacy).
 * 3. Else — 501 with setup instructions.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Content-Type', 'application/json');

  try {
    await handleClgSnapshot(req, res);
  } catch (e) {
    console.error('[clg-snapshot]', e);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Live scan hit an unexpected server error.',
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

async function handleClgSnapshot(req: VercelRequest, res: VercelResponse): Promise<void> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const upstream = process.env.CLG_SNAPSHOT_URL?.trim();

  if (req.method === 'GET') {
    res.status(200).json({
      ok: true,
      service: 'gost-clg-snapshot',
      mode: anthropicKey ? 'inline' : upstream ? 'proxy' : 'unconfigured',
      anthropicConfigured: Boolean(anthropicKey),
      proxyConfigured: Boolean(upstream),
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body: { url?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body as { url?: string });
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  // --- Built-in engine (preferred) ---
  if (anthropicKey) {
    try {
      const scan = await runMervHomepageScan(body.url || '', anthropicKey);
      res.status(200).json(scan);
    } catch (e) {
      if (e instanceof ScanHttpError) {
        res.status(e.status).json({
          error: e.message,
          ...(e.detail ? { detail: e.detail } : {}),
        });
        return;
      }
      const detail = e instanceof Error ? e.message : 'Unknown error';
      res.status(500).json({
        error: 'Live scan failed unexpectedly.',
        detail,
      });
    }
    return;
  }

  // --- Legacy proxy ---
  if (!upstream) {
    res.status(501).json({
      error: 'Live scan is not configured.',
      hint:
        'Set ANTHROPIC_API_KEY on this Vercel project to run the built-in CLG scanner, or set CLG_SNAPSHOT_URL to proxy an external Snapshot service. Redeploy after changing environment variables.',
    });
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
        'Prefer ANTHROPIC_API_KEY on this project for a self-contained scan. Otherwise confirm the external Snapshot is up and CLG_SNAPSHOT_URL is correct.',
    });
  }
}

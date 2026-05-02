/**
 * Server-only: fetch homepage HTML, extract copy, score with Claude.
 * Import only from Vercel/server code — pulls cheerio + Anthropic SDK.
 */

import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';
import { CLAUDE_SCAN_MODEL, SCORING_SYSTEM_PROMPT } from './scoringPrompt.js';
import type { MervEngineScanResult } from './types.js';

const FETCH_TIMEOUT_MS = 12_000;
const ANTHROPIC_TIMEOUT_MS = 35_000;

export class ScanHttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: string,
  ) {
    super(message);
    this.name = 'ScanHttpError';
  }
}

interface ExtractedContent {
  url: string;
  title: string;
  metaDescription: string;
  h1: string;
  h2s: string[];
  paragraphs: string[];
  buttons: string[];
  textSample: string;
}

async function fetchHomepage(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MervBot/1.0; +https://mervmarketing.com)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`Site returned status ${res.status}`);
    }

    const html = await res.text();
    if (html.length < 200) {
      throw new Error('Site returned empty or near-empty HTML');
    }
    return html;
  } finally {
    clearTimeout(timer);
  }
}

function extractRelevantCopy(html: string, url: string): ExtractedContent {
  const $ = cheerio.load(html);

  $('script, style, noscript, svg').remove();

  const title = ($('title').first().text() || '').trim();
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
  const h1 = ($('h1').first().text() || '').trim();
  const h2s = $('h2')
    .slice(0, 8)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((s) => s.length > 0);
  const paragraphs = $('p')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((p) => p.length > 30)
    .slice(0, 15);
  const buttons = $('a, button')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((s) => s.length > 0 && s.length < 60)
    .slice(0, 12);

  const textSample = $('body')
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);

  return {
    url,
    title,
    metaDescription,
    h1,
    h2s,
    paragraphs,
    buttons,
    textSample,
  };
}

function extractJSON(raw: string): string | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const obj = raw.match(/\{[\s\S]*\}/);
  if (obj) return obj[0];
  return null;
}

async function scoreWithClaude(content: ExtractedContent, apiKey: string): Promise<MervEngineScanResult> {
  const anthropic = new Anthropic({
    apiKey,
    timeout: ANTHROPIC_TIMEOUT_MS,
  });

  const userMessage = `Score this B2B SaaS homepage. The "extracted" object below is what we pulled from the page; the "textSample" is a longer raw text chunk for context.\n\n${JSON.stringify(
    content,
    null,
    2,
  )}`;

  const callOnce = async () => {
    const msg = await anthropic.messages.create({
      model: CLAUDE_SCAN_MODEL,
      max_tokens: 1500,
      system: SCORING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = msg.content.find((b) => b.type === 'text');
    const text = textBlock && 'text' in textBlock ? textBlock.text : '';
    const json = extractJSON(text);
    if (!json) {
      throw new Error('No JSON found in Claude response');
    }
    return JSON.parse(json) as MervEngineScanResult;
  };

  try {
    return await callOnce();
  } catch {
    return await callOnce();
  }
}

export function normalizeHomepageUrl(input: string): string | null {
  let candidate = input.trim();
  if (!candidate) return null;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  try {
    const u = new URL(candidate);
    if (!u.hostname || !u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Full CLG homepage scan (same contract as legacy POST /api/scan on clg-snapshot).
 */
export async function runMervHomepageScan(pageUrl: string, apiKey: string): Promise<MervEngineScanResult> {
  const url = normalizeHomepageUrl(pageUrl);
  if (!url) {
    throw new ScanHttpError(400, 'Please provide a valid URL.');
  }

  let html: string;
  try {
    html = await fetchHomepage(url);
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error';
    throw new ScanHttpError(
      422,
      "We couldn't reach that URL. Check that it's correct and publicly accessible, then try again.",
      detail,
    );
  }

  const content = extractRelevantCopy(html, url);
  if (!content.h1 && !content.title && content.textSample.length < 500) {
    throw new ScanHttpError(
      422,
      "We couldn't extract enough content from this page to score it. This sometimes happens with JavaScript-rendered single-page apps.",
    );
  }

  let scan: MervEngineScanResult;
  try {
    scan = await scoreWithClaude(content, apiKey);
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error';
    throw new ScanHttpError(502, 'Scoring failed. Please try again in a moment.', detail);
  }

  scan.scanned_url = url;
  scan.scanned_at = new Date().toISOString();
  return scan;
}

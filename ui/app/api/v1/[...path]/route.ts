/**
 * Next.js API proxy — forwards all /api/v1/* requests to the real backend.
 *
 * In production (Vercel), BACKEND_URL should be set to the deployed backend.
 * In local dev, it defaults to http://localhost:3001.
 *
 * This means the frontend ALWAYS calls its own /api/v1/... (relative URLs
 * work in every environment) and we never hard-code localhost in client code.
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:3001';

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const searchParams = req.nextUrl.searchParams.toString();
  const targetUrl = `${BACKEND_URL}/api/v1/${path}${searchParams ? `?${searchParams}` : ''}`;

  try {
    const init: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // Don't forward body for GET/HEAD
      ...(req.method !== 'GET' && req.method !== 'HEAD'
        ? { body: await req.text() }
        : {}),
    };

    const upstream = await fetch(targetUrl, init);
    const contentType = upstream.headers.get('content-type') ?? '';

    // For SSE streams, pipe through directly
    if (contentType.includes('text/event-stream')) {
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const data = await upstream.text();
    return new NextResponse(data, {
      status: upstream.status,
      headers: { 'Content-Type': contentType || 'application/json' },
    });
  } catch (err) {
    console.error(`[API Proxy] Failed to reach backend at ${targetUrl}:`, err);
    return NextResponse.json(
      { error: 'Backend unavailable', detail: String(err) },
      { status: 503 },
    );
  }
}

export const GET     = handler;
export const POST    = handler;
export const PUT     = handler;
export const PATCH   = handler;
export const DELETE  = handler;

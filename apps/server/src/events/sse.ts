// SSE Hub — يدير العصيات لكل مشروع ويعيد الاتصال.
import { Response } from 'express';

const clients = new Map<string, Set<Response>>();

export function sseHeaders(res: Response): Response {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');
  return res;
}

export function subscribe(projectId: string, res: Response): () => void {
  if (!clients.has(projectId)) clients.set(projectId, new Set());
  clients.get(projectId)!.add(res);
  const ping = setInterval(() => {
    if (res.writableEnded) return clearInterval(ping);
    res.write(': ping\n\n');
  }, 15000);
  res.on('close', () => {
    clearInterval(ping);
    clients.get(projectId)?.delete(res);
    if (clients.get(projectId)?.size === 0) clients.delete(projectId);
  });
  return () => res.end();
}

export function emit(projectId: string, event: unknown): void {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients.get(projectId) ?? []) {
    if (!res.writableEnded) res.write(payload);
  }
}
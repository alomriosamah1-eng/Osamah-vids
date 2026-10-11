// زبون SSE — يربط أحداث الأنابيب الحيّة بالواجهة.
export type LiveEvent = {
  type: string;
  ts: number;
  [k: string]: unknown;
};

export interface SseHandle {
  close: () => void;
}

export function connectSse(projectId: string, onEvent: (ev: LiveEvent) => void, onError?: (e: Event) => void): SseHandle {
  const es = new EventSource(`/api/projects/${encodeURIComponent(projectId)}/events`);
  es.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data) as LiveEvent);
    } catch { /* ignore */ }
  };
  es.onerror = (e) => {
    onError?.(e);
    // EventSource يعيد الاتصال تلقائيًا
  };
  return { close: () => es.close() };
}
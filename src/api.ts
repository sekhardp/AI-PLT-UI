import { getConfig } from './config';

/** Resolves the backend base URL at call-time from the runtime config. */
const getBase = () => getConfig().apiBaseUrl;



export async function streamChat(
  prompt: string,
  sessionId: string,
  onToken: (token: string) => void,
  onDone: (sid: string) => void
) {
  const params = new URLSearchParams({ prompt, session_id: sessionId });
  const res = await fetch(`${getBase()}/chat/stream?${params}`);
  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.done) {
          onDone(parsed.session_id);
        } else if (parsed.token !== undefined) {
          onToken(parsed.token);
        }
      } catch { /* ignore malformed */ }
    }
  }
}

export async function sendFeedback(sessionId: string, rating: 1 | -1, comment?: string) {
  await fetch(`${getBase()}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, rating, comment }),
  });
}

export async function fetchSessions() {
  const res = await fetch(`${getBase()}/history`);
  const data = await res.json();
  return data.sessions as Array<{ session_id: string; message_count: number; last_message: string; created_at: string }>;
}

export async function fetchSession(sessionId: string) {
  const res = await fetch(`${getBase()}/history/${sessionId}`);
  const data = await res.json();
  return data.messages as Array<{ role: string; content: string; timestamp: string }>;
}

export async function deleteSession(sessionId: string) {
  await fetch(`${getBase()}/history/${sessionId}`, { method: 'DELETE' });
}

export async function fetchAgents() {
  const res = await fetch(`${getBase()}/agents`);
  const data = await res.json();
  return data.agents;
}

export async function uploadFile(file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append('file', file);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const resp = JSON.parse(xhr.responseText);
        onProgress(100);
        resolve(resp.file_id);
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.open('POST', `${getBase()}/upload`);
    xhr.send(fd);
  });
}

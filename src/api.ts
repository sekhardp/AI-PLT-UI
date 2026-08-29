import { getConfig } from './config';

/** Resolves the backend base URL at call-time from the runtime config. */
const getBase = () => getConfig().apiBaseUrl;



export interface RoutingMeta {
  routed_to?: 'local' | 'frontier' | 'ai_router' | string;
  model?: string;
  stage?: string;
  complexity_score?: number;
}

export async function streamChat(
  prompt: string,
  sessionId: string,
  onToken: (token: string) => void,
  onDone: (sid: string, meta?: RoutingMeta) => void,
  onMeta?: (meta: RoutingMeta) => void,
  documentIds?: string[],
  userId?: string
) {
  const params = new URLSearchParams({ prompt, session_id: sessionId });
  if (documentIds && documentIds.length > 0) {
    params.set("document_ids", documentIds.join(","));
  }
  if (userId) {
    params.set("user_id", userId);
  }
  const res = await fetch(`${getBase()}/chat/stream?${params}`);
  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let routingMeta: RoutingMeta = {};

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
        if (parsed.routed_to || parsed.model || parsed.stage || parsed.type === 'routing_init' || parsed.type === 'routing_decision') {
          routingMeta = {
            routed_to: parsed.routed_to || routingMeta.routed_to,
            model: parsed.model || routingMeta.model,
            stage: parsed.stage || routingMeta.stage,
            complexity_score: parsed.complexity_score ?? routingMeta.complexity_score,
          };
          if (onMeta) {
            onMeta(routingMeta);
          }
        }
        if (parsed.done) {
          onDone(parsed.session_id, routingMeta);
        } else if (parsed.token !== undefined && parsed.token !== '') {
          onToken(parsed.token);
        }
      } catch { /* ignore malformed */ }
    }
  }
}

export interface NegativeFeedbackItem {
  id: string;
  session_id: string;
  user_id?: string;
  user_email?: string;
  username?: string;
  user_prompt: string;
  assistant_response: string;
  rating: number;
  comment?: string;
  model?: string;
  routed_to?: string;
  created_at: string;
  status?: 'open' | 'reviewed' | 'resolved';
}

const NEGATIVE_FEEDBACK_KEY = 'ai_platform_negative_feedback_v1';

export function getLocalNegativeFeedbacks(): NegativeFeedbackItem[] {
  try {
    const raw = localStorage.getItem(NEGATIVE_FEEDBACK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function recordNegativeFeedback(item: NegativeFeedbackItem) {
  try {
    const list = getLocalNegativeFeedbacks();
    const filtered = list.filter(f => !(f.session_id === item.session_id && f.user_prompt === item.user_prompt));
    localStorage.setItem(NEGATIVE_FEEDBACK_KEY, JSON.stringify([item, ...filtered]));
  } catch {}
}

export function updateNegativeFeedbackStatus(id: string, status: 'open' | 'reviewed' | 'resolved') {
  try {
    const list = getLocalNegativeFeedbacks();
    const updated = list.map(item => item.id === id ? { ...item, status } : item);
    localStorage.setItem(NEGATIVE_FEEDBACK_KEY, JSON.stringify(updated));
  } catch {}
}

export async function fetchNegativeFeedbacks(): Promise<NegativeFeedbackItem[]> {
  const localList = getLocalNegativeFeedbacks();
  try {
    const res = await fetch(`${getBase()}/feedback?rating=-1`);
    if (res.ok) {
      const data = await res.json();
      const serverList = Array.isArray(data) ? data : data.feedbacks || data.items || [];
      const combined = [...serverList, ...localList];
      const unique = Array.from(new Map(combined.map(item => [item.session_id + (item.user_prompt || item.id), item])).values());
      return unique;
    }
  } catch {}
  return localList;
}

export async function sendFeedback(sessionId: string, rating: 1 | -1, comment?: string, userId?: string) {
  await fetch(`${getBase()}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, rating, comment, user_id: userId }),
  }).catch(console.warn);
}

export async function fetchSessions(userId?: string) {
  const url = userId ? `${getBase()}/history?user_id=${encodeURIComponent(userId)}` : `${getBase()}/history`;
  const res = await fetch(url);
  const data = await res.json();
  return data.sessions as Array<{ session_id: string; message_count: number; last_message: string; created_at: string }>;
}

export async function fetchSession(sessionId: string, userId?: string) {
  const url = userId ? `${getBase()}/history/${sessionId}?user_id=${encodeURIComponent(userId)}` : `${getBase()}/history/${sessionId}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.messages as Array<{ role: string; content: string; timestamp: string }>;
}

export async function deleteSession(sessionId: string, userId?: string) {
  const url = userId ? `${getBase()}/history/${sessionId}?user_id=${encodeURIComponent(userId)}` : `${getBase()}/history/${sessionId}`;
  await fetch(url, { method: 'DELETE' });
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

export interface UserDocument {
  id: string;
  filename: string;
  file_size_bytes: number;
  file_size_mb: number;
  mime_type: string;
  status: "indexing" | "ready" | "failed";
  error_message?: string;
  created_at: string;
}

export interface QuotaInfo {
  total_documents: number;
  max_documents: number;
  total_bytes: number;
  total_mb: number;
  max_mb: number;
  remaining_mb: number;
}

export async function fetchDocuments(userId: string = "default_user"): Promise<{ documents: UserDocument[]; quota: QuotaInfo }> {
  const res = await fetch(`${getBase()}/documents?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return await res.json();
}

export async function uploadDocument(file: File, userId: string = "default_user"): Promise<any> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("user_id", userId);
  const res = await fetch(`${getBase()}/documents/upload`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Upload failed");
  }
  return await res.json();
}

export async function deleteDocument(docId: string, userId: string = "default_user"): Promise<void> {
  const res = await fetch(`${getBase()}/documents/${docId}?user_id=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete document");
}

// ─── Cloud SQL Users & Credit Bank APIs ──────────────────────────────────────
export interface DbUser {
  id: number;
  username: string;
  email: string;
  role: "user" | "admin";
  credits: number;
  tokensUsed: number;
  createdAt?: string;
}

export async function apiLoginUser(email: string, username?: string, password?: string): Promise<DbUser> {
  const res = await fetch(`${getBase()}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();
  return data.user;
}

export async function apiFetchUsers(): Promise<DbUser[]> {
  const res = await fetch(`${getBase()}/users`);
  if (!res.ok) throw new Error("Failed to fetch users");
  const data = await res.json();
  return data.users;
}

export async function apiUpdateUserCredits(email: string, credits: number): Promise<{ email: string; credits: number; tokensUsed: number }> {
  const res = await fetch(`${getBase()}/users/${encodeURIComponent(email)}/credits`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credits }),
  });
  if (!res.ok) throw new Error("Failed to update credits");
  const data = await res.json();
  return data.user;
}

export async function apiDeductUserCredit(email: string, amount: number = 1, tokens: number = 0): Promise<void> {
  await fetch(`${getBase()}/users/${encodeURIComponent(email)}/deduct`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, tokens }),
  }).catch(console.warn);
}

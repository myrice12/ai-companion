import type { ChatMessage, ChatSession, ContextPreview, LLMSettings } from "../types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(path, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || resp.statusText);
  }
  if (resp.status === 204) {
    return undefined as T;
  }
  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return resp.json();
  }
  return resp.text() as T;
}

export const api = {
  getSettings: () => request<LLMSettings>("/api/settings"),

  updateSettings: (data: Partial<LLMSettings & { api_key?: string }>) =>
    request<LLMSettings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  testSettings: () =>
    request<{ success: boolean; message: string }>("/api/settings/test", {
      method: "POST",
    }),

  listSessions: () => request<ChatSession[]>("/api/sessions"),

  createSession: (data?: { title?: string; system_prompt?: string }) =>
    request<ChatSession>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(data || {}),
    }),

  updateSession: (id: string, data: { title?: string; system_prompt?: string }) =>
    request<ChatSession>(`/api/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteSession: (id: string) =>
    request<{ ok: boolean }>(`/api/sessions/${id}`, { method: "DELETE" }),

  getMessages: (sessionId: string) =>
    request<ChatMessage[]>(`/api/sessions/${sessionId}/messages`),

  getContextPreview: (sessionId: string) =>
    request<ContextPreview>(`/api/sessions/${sessionId}/context`),

  exportSession: (sessionId: string) =>
    request<string>(`/api/sessions/${sessionId}/export`),

  streamChat: async (
    sessionId: string,
    content: string,
    onChunk: (chunk: string) => void,
    onDone: (data: { message_id?: string; title?: string }) => void,
    onError: (error: string) => void,
    signal?: AbortSignal,
  ) => {
    const resp = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, content }),
      signal,
    });

    if (!resp.ok) {
      const text = await resp.text();
      onError(text || "请求失败");
      return;
    }

    const reader = resp.body?.getReader();
    if (!reader) {
      onError("无法读取响应流");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.error) {
            onError(data.error);
            return;
          }
          if (data.content) {
            onChunk(data.content);
          }
          if (data.done) {
            onDone({ message_id: data.message_id, title: data.title });
          }
        } catch {
          // ignore malformed chunks
        }
      }
    }
  },
};

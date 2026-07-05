import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { ChatMessage, ChatSession } from "../types";
import { MessageBubble } from "./MessageBubble";

interface Props {
  session: ChatSession | null;
  settingsConfigured: boolean;
  onSessionTitleChange: (title: string) => void;
  onOpenSettings: () => void;
}

export function ChatWindow({
  session,
  settingsConfigured,
  onSessionTitleChange,
  onOpenSettings,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!session) {
      setMessages([]);
      return;
    }
    setError(null);
    api.getMessages(session.id).then(setMessages).catch((e) => setError(String(e)));
  }, [session?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = useCallback(async () => {
    if (!session || !input.trim() || loading) return;

    if (!settingsConfigured) {
      setError("请先配置 LLM API 哦～");
      return;
    }

    const content = input.trim();
    setInput("");
    setError(null);
    setLoading(true);
    setStreamingContent("");

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: session.id,
      role: "user",
      content,
      token_count: 0,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    abortRef.current = new AbortController();
    let accumulated = "";

    await api.streamChat(
      session.id,
      content,
      (chunk) => {
        accumulated += chunk;
        setStreamingContent(accumulated);
      },
      async ({ title }) => {
        setLoading(false);
        setStreamingContent("");
        if (title) onSessionTitleChange(title);
        const fresh = await api.getMessages(session.id);
        setMessages(fresh);
      },
      (err) => {
        setError(err);
        setLoading(false);
        setStreamingContent("");
      },
      abortRef.current.signal,
    );
  }, [session, input, loading, settingsConfigured, onSessionTitleChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center chat-bg-pattern">
        <div className="text-center cute-card px-10 py-8">
          <div className="text-5xl mb-3 animate-bounce-soft">🌸</div>
          <p className="text-lg font-bold text-rose-700 mb-1">选一个对话吧</p>
          <p className="text-sm text-rose-400">或者点左边「新对话」开始聊天～</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 chat-bg-pattern">
      <header className="px-6 py-4 border-b border-rose-100/80 bg-white/30 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span>💭</span>
          <h2 className="text-lg font-bold text-rose-700 truncate">{session.title}</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 && !loading && (
          <div className="text-center mt-16">
            <div className="text-4xl mb-3">🐱</div>
            <p className="text-rose-400 font-medium">嗨～ 有什么想聊的吗？</p>
            {!settingsConfigured && (
              <button onClick={onOpenSettings} className="btn-primary mt-4 px-6">
                先配置 API ✨
              </button>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {streamingContent && (
          <MessageBubble
            message={{
              id: "streaming",
              session_id: session.id,
              role: "assistant",
              content: streamingContent,
              token_count: 0,
              created_at: new Date().toISOString(),
            }}
            streaming
          />
        )}

        {error && (
          <div className="text-center my-4">
            <div className="inline-block text-sm text-red-500 bg-red-50 border border-red-100 rounded-2xl py-2 px-4">
              😿 {error}
              {!settingsConfigured && (
                <button onClick={onOpenSettings} className="ml-2 underline text-rose-500">
                  去配置
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-rose-100/80 bg-white/40 backdrop-blur-sm">
        <div className="flex gap-3 items-end max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              settingsConfigured ? "说点什么吧～ Enter 发送 ✨" : "请先配置 API Key 哦"
            }
            disabled={loading || !settingsConfigured}
            rows={2}
            className="flex-1 resize-none rounded-2xl bg-white/80 border border-rose-100 px-4 py-3 text-sm text-rose-800 placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || !settingsConfigured}
            className="px-5 py-3 rounded-2xl btn-primary disabled:opacity-50"
          >
            {loading ? "..." : "发送 💌"}
          </button>
        </div>
      </div>
    </div>
  );
}

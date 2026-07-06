import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@shared/api/client";
import type { ChatMessage, ChatSession, LLMSettings } from "@shared/types";
import { isSettingsConfigured } from "@shared/constants/llmPresets";
import { TitleBar } from "./components/TitleBar";
import { SessionPicker } from "./components/SessionPicker";
import { MessageList } from "./components/MessageList";
import { ChatInput } from "./components/ChatInput";
import { BackendStatus } from "./components/BackendStatus";
import { EmptyState } from "./components/EmptyState";
import { NewSessionModal } from "./components/NewSessionModal";

type ConnectionState = "checking" | "online" | "offline";

export function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<LLMSettings | null>(null);
  const [connState, setConnState] = useState<ConnectionState>("checking");
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const pollRef = useRef<number | null>(null);

  const refreshSessions = useCallback(async (): Promise<ChatSession[]> => {
    try {
      const list = await api.listSessions();
      setSessions(list);
      setConnState("online");
      return list;
    } catch (e) {
      setConnState("offline");
      setError(`无法连接后端：${String(e)}`);
      throw e;
    }
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const resp = await fetch("/api/health");
      if (resp.ok) {
        setConnState("online");
        return true;
      }
    } catch {
      // ignore
    }
    setConnState("offline");
    return false;
  }, []);

  useEffect(() => {
    (async () => {
      const online = await checkHealth();
      if (!online) {
        setError("连不上后端服务，请确认 Docker 已启动（docker compose up -d）");
        return;
      }
      try {
        const s = await api.getSettings();
        setSettings(s);
      } catch (e) {
        setError(`读取设置失败：${String(e)}`);
      }
      try {
        const list = await refreshSessions();
        if (list.length > 0) setActiveSession(list[0]);
      } catch {
        // already handled
      }
      try {
        setAlwaysOnTop(await window.desktopBridge.isAlwaysOnTop());
      } catch {
        // ignore
      }
    })();
  }, [checkHealth, refreshSessions]);

  useEffect(() => {
    if (connState !== "online") return;
    pollRef.current = window.setInterval(async () => {
      try {
        const list = await api.listSessions();
        setSessions(list);
        if (activeSession) {
          const updated = list.find((s) => s.id === activeSession.id);
          if (updated && updated.updated_at !== activeSession.updated_at) {
            setActiveSession(updated);
          }
        }
      } catch {
        // ignore, keep last known state
      }
    }, 5000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [connState, activeSession]);

  useEffect(() => {
    if (!activeSession) {
      setMessages([]);
      return;
    }
    setError(null);
    api
      .getMessages(activeSession.id)
      .then(setMessages)
      .catch((e) => setError(`加载消息失败：${String(e)}`));
  }, [activeSession?.id]);

  useEffect(() => {
    const off = window.desktopBridge.onNewSessionShortcut(() => {
      setShowNewSessionModal(true);
    });
    return off;
  }, []);

  const handleCreate = useCallback(
    async (title?: string) => {
      try {
        const session = await api.createSession({ title });
        const list = await refreshSessions();
        const created = list.find((s) => s.id === session.id) || session;
        setActiveSession(created);
        setShowNewSessionModal(false);
      } catch (e) {
        setError(`新建会话失败：${String(e)}`);
      }
    },
    [refreshSessions],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("确定删除此会话吗？")) return;
      try {
        await api.deleteSession(id);
        const list = await refreshSessions();
        if (activeSession?.id === id) {
          setActiveSession(list[0] || null);
        }
      } catch (e) {
        setError(`删除失败：${String(e)}`);
      }
    },
    [activeSession, refreshSessions],
  );

  const sendMessage = useCallback(async () => {
    if (!activeSession || !input.trim() || loading) return;
    if (!settings || !isSettingsConfigured(settings)) {
      setError("请先在网页端配置 LLM API Key ✨");
      return;
    }
    const content = input.trim();
    setInput("");
    setError(null);
    setLoading(true);
    setStreaming("");

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: activeSession.id,
      role: "user",
      content,
      token_count: 0,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    abortRef.current = new AbortController();
    let accumulated = "";

    await api.streamChat(
      activeSession.id,
      content,
      (chunk) => {
        accumulated += chunk;
        setStreaming(accumulated);
      },
      async ({ title }) => {
        setLoading(false);
        setStreaming("");
        if (title && activeSession.title === "新对话") {
          setActiveSession({ ...activeSession, title });
        }
        try {
          const fresh = await api.getMessages(activeSession.id);
          setMessages(fresh);
        } catch {
          // ignore
        }
        refreshSessions();
      },
      (err) => {
        setError(err);
        setLoading(false);
        setStreaming("");
      },
      abortRef.current.signal,
    );
  }, [activeSession, input, loading, settings, refreshSessions]);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleToggleAlwaysOnTop = useCallback(async () => {
    try {
      const next = await window.desktopBridge.toggleAlwaysOnTop();
      setAlwaysOnTop(next);
    } catch {
      // ignore
    }
  }, []);

  const showInput = !!activeSession && connState === "online";
  const configured = settings ? isSettingsConfigured(settings) : false;

  return (
    <div className="widget-shell">
      <TitleBar
        title={activeSession?.title || "小伴 AI"}
        alwaysOnTop={alwaysOnTop}
        onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
        onHide={() => window.desktopBridge.hide()}
        onQuit={() => window.desktopBridge.quit()}
        onOpenWeb={() => window.desktopBridge.openWeb()}
      />

      <div className="flex items-center gap-2 px-3 py-2 border-b border-rose-100/40 bg-white/30">
        <SessionPicker
          sessions={sessions}
          activeId={activeSession?.id ?? null}
          onSelect={(s) => {
            setActiveSession(s);
            setShowSessionPicker(false);
          }}
          onNew={() => setShowNewSessionModal(true)}
          onDelete={handleDelete}
          open={showSessionPicker}
          onToggle={() => setShowSessionPicker((v) => !v)}
          onClose={() => setShowSessionPicker(false)}
        />
        <div className="ml-auto">
          <BackendStatus state={connState} />
        </div>
      </div>

      <MessageList
        messages={messages}
        streaming={streaming}
        loading={loading}
        error={error}
        configured={configured}
        onOpenWeb={() => window.desktopBridge.openWeb()}
        onDismissError={() => setError(null)}
        onRetry={() => checkHealth()}
      />

      {!activeSession && connState === "online" && sessions.length === 0 && (
        <EmptyState onCreate={() => setShowNewSessionModal(true)} />
      )}

      {showInput && (
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          onCancel={cancelStream}
          loading={loading}
          disabled={!configured}
          placeholder={configured ? "说点什么吧～ Enter 发送 ✨" : "请先在网页端配置 API ✨"}
        />
      )}

      <NewSessionModal
        open={showNewSessionModal}
        onClose={() => setShowNewSessionModal(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
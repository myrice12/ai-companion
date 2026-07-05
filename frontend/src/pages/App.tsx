import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { ApiConfigModal } from "../components/ApiConfigModal";
import { ChatWindow } from "../components/ChatWindow";
import { SessionSidebar } from "../components/SessionSidebar";
import { SettingsPanel } from "../components/SettingsPanel";
import { isSettingsConfigured } from "../constants/llmPresets";
import type { ChatSession } from "../types";

export function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [settingsConfigured, setSettingsConfigured] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [settingsChecked, setSettingsChecked] = useState(false);

  useEffect(() => {
    api.getSettings().then((s) => {
      const configured = isSettingsConfigured(s);
      setSettingsConfigured(configured);
      setSettingsChecked(true);
      if (!configured) setShowApiModal(true);
    });
  }, []);

  const refreshSessions = useCallback(async () => {
    const list = await api.listSessions();
    setSessions(list);
    if (activeSession) {
      const updated = list.find((s) => s.id === activeSession.id);
      if (updated) setActiveSession(updated);
      else if (list.length > 0) setActiveSession(list[0]);
      else setActiveSession(null);
    }
  }, [activeSession]);

  useEffect(() => {
    api.listSessions().then((list) => {
      setSessions(list);
      if (list.length > 0) setActiveSession(list[0]);
    });
  }, []);

  const handleSessionTitleChange = useCallback(
    (title: string) => {
      if (activeSession) {
        setActiveSession({ ...activeSession, title });
      }
      refreshSessions();
    },
    [activeSession, refreshSessions],
  );

  if (!settingsChecked) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl animate-bounce-soft mb-3">🌸</div>
          <p className="text-rose-400 font-medium">正在唤醒小伙伴...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SessionSidebar
        sessions={sessions}
        activeId={activeSession?.id ?? null}
        onSelect={setActiveSession}
        onRefresh={refreshSessions}
        onOpenSettings={() => setShowApiModal(true)}
        settingsConfigured={settingsConfigured}
      />
      <ChatWindow
        session={activeSession}
        settingsConfigured={settingsConfigured}
        onSessionTitleChange={handleSessionTitleChange}
        onOpenSettings={() => setShowApiModal(true)}
      />
      <SettingsPanel
        session={activeSession}
        onSessionUpdate={refreshSessions}
        onSettingsChange={setSettingsConfigured}
        onOpenApiConfig={() => setShowApiModal(true)}
      />
      <ApiConfigModal
        open={showApiModal}
        onClose={() => setShowApiModal(false)}
        onConfigured={setSettingsConfigured}
      />
    </div>
  );
}

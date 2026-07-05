import { useState } from "react";
import { api } from "../api/client";
import type { ChatSession } from "../types";

interface Props {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (session: ChatSession) => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  settingsConfigured: boolean;
}

export function SessionSidebar({
  sessions,
  activeId,
  onSelect,
  onRefresh,
  onOpenSettings,
  settingsConfigured,
}: Props) {
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const session = await api.createSession();
      onRefresh();
      onSelect(session);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("确定删除此会话吗？🥺")) return;
    await api.deleteSession(id);
    onRefresh();
  };

  const handleExport = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const content = await api.exportSession(id);
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="w-64 shrink-0 border-r border-rose-100/80 bg-white/40 backdrop-blur-sm flex flex-col">
      <div className="p-4 border-b border-rose-100/80">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🐱</span>
          <h1 className="text-base font-extrabold text-rose-700">小伴 AI</h1>
        </div>
        <p className="text-xs text-rose-300 mb-3 ml-9">你的温暖陪伴</p>

        {!settingsConfigured && (
          <button onClick={onOpenSettings} className="btn-primary w-full mb-2 text-xs">
            ⚙️ 配置 API
          </button>
        )}

        <button
          onClick={handleCreate}
          disabled={creating}
          className="btn-primary w-full disabled:opacity-50"
        >
          {creating ? "创建中..." : "✨ 新对话"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelect(s)}
            className={`group relative sidebar-item ${
              activeId === s.id ? "sidebar-item-active" : "sidebar-item-inactive"
            }`}
          >
            <p className="truncate pr-14 flex items-center gap-1.5">
              <span className="text-xs">💬</span>
              {s.title}
            </p>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5">
              <button
                onClick={(e) => handleExport(e, s.id)}
                title="导出"
                className="w-6 h-6 rounded-full text-xs text-rose-400 hover:bg-rose-100 hover:text-rose-600"
              >
                ↓
              </button>
              <button
                onClick={(e) => handleDelete(e, s.id)}
                title="删除"
                className="w-6 h-6 rounded-full text-xs text-rose-400 hover:bg-red-100 hover:text-red-500"
              >
                ×
              </button>
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="text-center py-10">
            <div className="text-3xl mb-2">🌷</div>
            <p className="text-rose-300 text-xs">还没有对话哦</p>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-rose-100/80">
        <button
          onClick={onOpenSettings}
          className="w-full py-2 rounded-2xl text-xs text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all font-medium"
        >
          🔧 API 设置
        </button>
      </div>
    </aside>
  );
}

import { useEffect, useRef } from "react";
import type { ChatSession } from "@shared/types";

interface Props {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (s: ChatSession) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function SessionPicker({ sessions, activeId, onSelect, onNew, onDelete, open, onToggle, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const active = sessions.find((s) => s.id === activeId);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  return (
    <div className="relative" ref={ref}>
      <button className="session-pill flex items-center gap-1.5 max-w-[220px]" onClick={onToggle}>
        <span>💬</span>
        <span className="truncate">{active?.title || "选择会话"}</span>
        <span className="text-[10px] opacity-60">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-72 max-h-80 overflow-y-auto cute-card p-1.5 z-50 animate-pop-in">
          <button
            onClick={() => {
              onNew();
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-2xl text-xs font-semibold text-rose-600 bg-gradient-to-r from-rose-100 to-pink-100 hover:from-rose-200 hover:to-pink-200 mb-1"
          >
            ✨ 新对话
          </button>

          {sessions.length === 0 && (
            <p className="text-center text-xs text-rose-300 py-4">还没有对话哦</p>
          )}

          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center gap-1 px-3 py-1.5 rounded-xl cursor-pointer text-xs ${
                s.id === activeId
                  ? "bg-rose-100 text-rose-800 font-semibold"
                  : "text-rose-500 hover:bg-rose-50"
              }`}
              onClick={() => onSelect(s)}
            >
              <span className="truncate flex-1">{s.title}</span>
              <button
                className="opacity-0 group-hover:opacity-100 text-rose-300 hover:text-red-400 text-xs w-5 h-5 rounded-full hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(s.id);
                }}
                title="删除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
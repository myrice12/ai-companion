import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (title?: string) => void;
}

export function NewSessionModal({ open, onClose, onCreate }: Props) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (open) setTitle("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="cute-card w-72 p-5 animate-pop-in">
        <h3 className="text-sm font-bold text-rose-700 mb-3">✨ 新对话</h3>
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="起个名字（可选）"
          className="w-full rounded-2xl bg-white/80 border border-rose-100 px-3 py-2 text-xs text-rose-800 placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200 mb-3"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onCreate(title.trim() || undefined);
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-2xl bg-white/80 border border-rose-100 text-rose-500 text-xs font-semibold hover:bg-rose-50">
            取消
          </button>
          <button onClick={() => onCreate(title.trim() || undefined)} className="flex-1 send-button">
            创建
          </button>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onCancel: () => void;
  loading: boolean;
  disabled: boolean;
  placeholder: string;
}

export function ChatInput({ value, onChange, onSend, onCancel, loading, disabled, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!loading) ref.current?.focus();
  }, [loading]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (loading) onCancel();
      else onSend();
    }
  };

  return (
    <div className="p-3 border-t border-rose-100/50 bg-white/40">
      <div className="flex gap-2 items-end">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          disabled={disabled && !loading}
          rows={1}
          className="flex-1 resize-none rounded-2xl bg-white/80 border border-rose-100 px-3 py-2 text-xs text-rose-800 placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200 max-h-24 disabled:opacity-50"
        />
        <button
          onClick={loading ? onCancel : onSend}
          disabled={!loading && (!value.trim() || disabled)}
          className="send-button"
        >
          {loading ? "停止" : "发送"}
        </button>
      </div>
    </div>
  );
}
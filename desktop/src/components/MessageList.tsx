import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@shared/types";

interface Props {
  messages: ChatMessage[];
  streaming: string;
  loading: boolean;
  error: string | null;
  configured: boolean;
  onOpenWeb: () => void;
  onDismissError: () => void;
  onRetry: () => void;
}

export function MessageList({
  messages,
  streaming,
  loading,
  error,
  configured,
  onOpenWeb,
  onDismissError,
  onRetry,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      {messages.length === 0 && !loading && !streaming && (
        <div className="text-center mt-10">
          <div className="text-3xl mb-2 animate-bounce-soft inline-block">🐱</div>
          <p className="text-sm text-rose-500 font-semibold mb-1">嗨～ 来聊点什么？</p>
          <p className="text-xs text-rose-300">和网页端共享同一个数据库</p>
        </div>
      )}

      {messages.map((msg) => (
        <Bubble key={msg.id} message={msg} />
      ))}

      {streaming && (
        <Bubble
          message={{
            id: "streaming",
            session_id: "streaming",
            role: "assistant",
            content: streaming,
            token_count: 0,
            created_at: new Date().toISOString(),
          }}
          streaming
        />
      )}

      {loading && !streaming && (
        <div className="flex gap-2 items-center text-rose-400 text-xs ml-11 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 streaming-dot" />
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 streaming-dot" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 streaming-dot" style={{ animationDelay: "300ms" }} />
        </div>
      )}

      {error && (
        <div className="my-3 mx-1">
          <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-2xl px-3 py-2 leading-relaxed">
            <div className="flex items-start gap-2">
              <span>😿</span>
              <span className="flex-1 break-words">{error}</span>
              <button onClick={onDismissError} className="text-red-300 hover:text-red-500 ml-1">
                ×
              </button>
            </div>
            <div className="mt-1.5 flex gap-2 flex-wrap">
              {!configured && (
                <button onClick={onOpenWeb} className="underline text-rose-500">
                  去网页端配置
                </button>
              )}
              <button onClick={onRetry} className="underline text-rose-400">
                重试连接
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function Bubble({ message, streaming }: { message: ChatMessage; streaming?: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2 mb-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-sm ${
          isUser ? "bg-gradient-to-br from-sky-300 to-blue-400" : "bg-gradient-to-br from-rose-200 to-pink-300"
        }`}
      >
        {isUser ? "🙂" : "🐱"}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm text-sm leading-relaxed ${
          isUser
            ? "bg-gradient-to-br from-sky-400 to-blue-400 text-white rounded-tr-md"
            : "bg-white/80 border border-rose-100 text-rose-900 rounded-tl-md"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words text-xs">{message.content}</p>
        ) : (
          <div className="markdown-body text-xs text-rose-800">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {streaming && <span className="streaming-dot inline-block w-1.5 h-1.5 rounded-full bg-rose-400 ml-1 align-middle" />}
          </div>
        )}
      </div>
    </div>
  );
}
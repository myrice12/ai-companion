import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "../types";

interface Props {
  message: ChatMessage;
  streaming?: boolean;
}

export function MessageBubble({ message, streaming }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2.5 mb-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-sm ${
          isUser
            ? "bg-gradient-to-br from-sky-300 to-blue-400"
            : "bg-gradient-to-br from-rose-200 to-pink-300"
        }`}
      >
        {isUser ? "🙂" : "🐱"}
      </div>

      <div
        className={`max-w-[70%] rounded-3xl px-4 py-3 shadow-sm ${
          isUser
            ? "bg-gradient-to-br from-sky-400 to-blue-400 text-white rounded-tr-md"
            : "bg-white/80 border border-rose-100 text-rose-900 rounded-tl-md"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
        ) : (
          <div className="markdown-body text-sm leading-relaxed text-rose-800">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {streaming && (
              <span className="inline-flex gap-0.5 ml-1 align-middle">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useCallback, useRef, useState } from "react";
import { api } from "../api/client";

interface UseChatOptions {
  sessionId: string | null;
  onTitleChange?: (title: string) => void;
  onMessagesRefresh?: () => Promise<void>;
}

export function useChat({ sessionId, onTitleChange, onMessagesRefresh }: UseChatOptions) {
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!sessionId || !content.trim() || loading) return false;

      setLoading(true);
      setStreamingContent("");
      setError(null);
      abortRef.current = new AbortController();

      let accumulated = "";
      await api.streamChat(
        sessionId,
        content.trim(),
        (chunk) => {
          accumulated += chunk;
          setStreamingContent(accumulated);
        },
        async ({ title }) => {
          setLoading(false);
          setStreamingContent("");
          if (title) onTitleChange?.(title);
          await onMessagesRefresh?.();
        },
        (err) => {
          setError(err);
          setLoading(false);
          setStreamingContent("");
        },
        abortRef.current.signal,
      );
      return true;
    },
    [sessionId, loading, onTitleChange, onMessagesRefresh],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
    setStreamingContent("");
  }, []);

  return { loading, streamingContent, error, sendMessage, cancel, setError };
}

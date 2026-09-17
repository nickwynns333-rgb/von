/**
 * useStreamingChat
 * Calls /api/chat/stream and accumulates tokens via SSE.
 * Falls back to the standard tRPC mutation if streaming is not enabled.
 */
import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  streaming?: boolean;
}

interface UseStreamingChatOptions {
  widgetKey: string;
  sessionId: string;
  streamingEnabled?: boolean;
}

export function useStreamingChat({ widgetKey, sessionId, streamingEnabled = true }: UseStreamingChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string, visitorName?: string, visitorEmail?: string) => {
    if (!content.trim() || isStreaming) return;

    // Add user message immediately
    const userMsg: ChatMessage = { role: "user", content, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setError(null);

    if (streamingEnabled) {
      // SSE streaming path
      setIsStreaming(true);

      // Add a placeholder assistant message that we'll fill token-by-token
      const placeholderId = Date.now();
      setMessages(prev => [...prev, { role: "assistant", content: "", timestamp: new Date().toISOString(), streaming: true }]);

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ widgetKey, sessionId, message: content, visitorName, visitorEmail }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) throw new Error("Stream unavailable");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            try {
              const json = JSON.parse(trimmed.slice(6));
              if (json.token) {
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = { ...last, content: last.content + json.token };
                  }
                  return updated;
                });
              }
              if (json.done) {
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = { ...last, streaming: false };
                  }
                  return updated;
                });
              }
              if (json.error) throw new Error(json.error);
            } catch { /* skip malformed lines */ }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message ?? "Stream error");
          // Remove the placeholder on error
          setMessages(prev => prev.filter(m => !m.streaming));
        }
      } finally {
        setIsStreaming(false);
        // Ensure streaming flag is cleared
        setMessages(prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m));
      }
    } else {
      // Non-streaming path: POST to /api/chat/stream which returns JSON when streaming=false
      setIsStreaming(true);
      try {
        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ widgetKey, sessionId, message: content, visitorName, visitorEmail }),
        });
        const data = await res.json();
        if (data.reply) {
          setMessages(prev => [...prev, { role: "assistant", content: data.reply, timestamp: new Date().toISOString() }]);
        }
      } catch (err: any) {
        setError(err.message ?? "Request failed");
      } finally {
        setIsStreaming(false);
      }
    }
  }, [widgetKey, sessionId, streamingEnabled, isStreaming]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, error, sendMessage, stopStreaming, clearMessages };
}

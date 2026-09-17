/**
 * StreamingChatDemo
 * Embeddable chat widget that uses SSE streaming when enableStreaming = true.
 * Used in the Agent Editor "Test Chat" tab and the public widget embed.
 */
import { useRef, useEffect, useState } from "react";
import { Send, Square, Loader2, MessageSquare } from "lucide-react";
import { useStreamingChat } from "@/hooks/useStreamingChat";

interface StreamingChatDemoProps {
  widgetKey: string;
  sessionId: string;
  botName?: string;
  streamingEnabled?: boolean;
  welcomeMessage?: string;
  accentColor?: string;
}

export function StreamingChatDemo({
  widgetKey,
  sessionId,
  botName = "AI Assistant",
  streamingEnabled = true,
  welcomeMessage = "Hi! How can I help you today?",
  accentColor = "#2563eb",
}: StreamingChatDemoProps) {
  const { messages, isStreaming, error, sendMessage, stopStreaming } = useStreamingChat({
    widgetKey,
    sessionId,
    streamingEnabled,
  });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full min-h-[400px] max-h-[600px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100" style={{ background: accentColor }}>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{botName}</p>
          <p className="text-xs text-white/70">{streamingEnabled ? "Streaming enabled" : "Standard mode"}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-white/80">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Welcome message */}
        <div className="flex gap-2.5">
          <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ background: accentColor }}>
            AI
          </div>
          <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[80%]">
            <p className="text-sm text-gray-800">{welcomeMessage}</p>
          </div>
        </div>

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ background: accentColor }}>
                AI
              </div>
            )}
            <div
              className={`rounded-2xl px-3.5 py-2.5 max-w-[80%] text-sm ${
                msg.role === "user"
                  ? "text-white rounded-tr-sm"
                  : "bg-gray-100 text-gray-800 rounded-tl-sm"
              }`}
              style={msg.role === "user" ? { background: accentColor } : undefined}
            >
              {msg.content}
              {msg.streaming && (
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-gray-400 animate-pulse rounded-sm align-middle" />
              )}
            </div>
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ background: accentColor }}>
              AI
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-500 text-center py-1">{error}</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-h-[40px] max-h-[120px]"
            placeholder="Type a message..."
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition-colors flex-shrink-0"
              title="Stop streaming"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              style={{ background: accentColor }}
              title="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-1.5">
          Powered by VonWork AI · {streamingEnabled ? "Streaming" : "Standard"}
        </p>
      </div>
    </div>
  );
}

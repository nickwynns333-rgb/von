import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { customerNavItems, DashboardShell } from "@/components/DashboardShell";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useEffect, useState } from "react";
import { MessageSquare, Search, Filter, Clock, User, Bot, Send } from "lucide-react";

export default function MasterChat() {
  const { isAuthenticated, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);

  const widgetsQuery = trpc.chatWidget.list.useQuery(undefined, {
    enabled: !!isAuthenticated,
  });

  const widgets = (widgetsQuery.data ?? []) as any[];

  // Aggregate all conversations across all widgets
  const allConvsQueries = widgets.map((w) =>
    trpc.chatWidget.listConversations.useQuery({ widgetId: w.id }, { enabled: !!isAuthenticated })
  );

  const allConversations = allConvsQueries
    .flatMap((q, i) => (q.data ?? []).map((c: any) => ({ ...c, widgetName: widgets[i]?.name })))
    .filter((c: any) =>
      search
        ? (c.visitorEmail ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (c.widgetName ?? "").toLowerCase().includes(search.toLowerCase())
        : true
    )
    .sort((a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  if (loading || !isAuthenticated) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    resolved: "bg-gray-100 text-gray-600",
    abandoned: "bg-yellow-100 text-yellow-700",
  };

  const selectedMessages = selectedConv?.messages
    ? (JSON.parse(selectedConv.messages) as { role: string; content: string }[])
    : [];

  return (
    <DashboardShell navItems={customerNavItems} title="MasterChat" role="customer">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MasterChat</h1>
            <p className="text-sm text-gray-500 mt-1">Unified inbox for all your AI agent conversations</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-700 text-xs">{allConversations.length} conversations</Badge>
          </div>
        </div>

        <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
          {/* Sidebar: conversation list */}
          <div className="w-80 flex-shrink-0 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="pl-9 border-gray-200 text-sm h-8"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {allConversations.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No conversations yet</p>
                  <p className="text-xs text-gray-400 mt-1">Deploy a chat widget to start receiving messages</p>
                </div>
              ) : (
                allConversations.map((conv: any) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      selectedConv?.id === conv.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {conv.visitorEmail ?? "Anonymous"}
                      </span>
                      <Badge className={`text-xs flex-shrink-0 ml-1 ${statusColor[conv.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {conv.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Bot className="w-3 h-3" />
                      <span className="truncate">{conv.widgetName}</span>
                      <span className="mx-1">·</span>
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="flex-shrink-0">
                        {new Date(conv.lastMessageAt).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main: conversation view */}
          <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
            {!selectedConv ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Select a conversation to view</p>
                </div>
              </div>
            ) : (
              <>
                {/* Conv header */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-semibold">
                      {(selectedConv.visitorEmail?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {selectedConv.visitorEmail ?? "Anonymous Visitor"}
                      </div>
                      <div className="text-xs text-gray-500">via {selectedConv.widgetName}</div>
                    </div>
                  </div>
                  <Badge className={`text-xs ${statusColor[selectedConv.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {selectedConv.status}
                  </Badge>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selectedMessages.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-400">No messages in this conversation</div>
                  ) : (
                    selectedMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`flex items-start gap-2 max-w-[75%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                            msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                          }`}>
                            {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                          </div>
                          <div className={`px-3 py-2 rounded-2xl text-sm ${
                            msg.role === "user"
                              ? "bg-blue-600 text-white rounded-tr-sm"
                              : "bg-gray-100 text-gray-800 rounded-tl-sm"
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply bar (read-only note) */}
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type a reply... (human takeover coming soon)"
                      className="border-gray-200 text-sm"
                      disabled
                    />
                    <Button size="icon" className="bg-blue-600 hover:bg-blue-700 text-white w-9 h-9 flex-shrink-0" disabled>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Human takeover reply is coming in a future update.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

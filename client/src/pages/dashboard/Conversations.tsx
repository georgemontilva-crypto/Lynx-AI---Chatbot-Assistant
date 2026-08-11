import { useState } from "react";
import { motion } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { MessageSquare, Search, Star, Filter, User, Clock, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ConvRow = {
  id: number;
  visitorId: string | null;
  pageUrl: string | null;
  messages: Array<{ role: string; content: string; timestamp: number }> | null;
  satisfactionRating: number | null;
  isLead: boolean | null;
  leadEmail: string | null;
  leadName: string | null;
  leadCompany: string | null;
  duration: number | null;
  createdAt: Date;
};

function timeAgo(date: Date) {
  try { return formatDistanceToNow(date, { addSuffix: true }); } catch { return "recently"; }
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function ConversationsContent() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const { data: rawConversations, isLoading } = trpc.conversations.list.useQuery();
  const conversations: ConvRow[] = (rawConversations ?? []) as ConvRow[];

  function getVisitorLabel(c: ConvRow) {
    if (c.leadName) return c.leadName;
    if (c.leadEmail) return c.leadEmail.split("@")[0];
    if (c.visitorId) return `Visitor ${c.visitorId.slice(0, 8)}`;
    return `Visitor #${c.id}`;
  }

  const filtered = conversations.filter((c) => {
    const visitorLabel = getVisitorLabel(c);
    const matchSearch =
      visitorLabel.toLowerCase().includes(search.toLowerCase()) ||
      (c.pageUrl ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.leadEmail ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.leadName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRating = filterRating === null || c.satisfactionRating === filterRating;
    return matchSearch && matchRating;
  });

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const selectedMessages = selected?.messages ?? [];

  return (
    <DashboardShell title="Conversation history">
      {/* Each column scrolls on its own inside the viewport height, so a long
          conversation list no longer scrolls the whole page and leaves the
          transcript stranded next to empty space. Below lg it falls back to
          normal page flow (stacked columns). */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:h-[calc(100vh-8rem)] lg:supports-[height:100dvh]:h-[calc(100dvh-8rem)]">
        {/* List */}
        <div className="lg:col-span-2 space-y-4 lg:min-h-0 lg:flex lg:flex-col">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations..." className="pl-9 bg-muted/30 border-border/40 text-sm h-9" />
            </div>
            <Button variant="outline" size="sm" className="border-border/40 h-9" onClick={() => setFilterRating(null)}>
              <Filter className="w-3.5 h-3.5 mr-1" />Clear
            </Button>
          </div>

          {/* Rating filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setFilterRating(null)} className={`px-2.5 py-1 rounded-full text-xs transition-all ${filterRating === null ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}>All</button>
            {[5, 4, 3, 2, 1].map((r) => (
              <button key={r} onClick={() => setFilterRating(filterRating === r ? null : r)}
                className={`px-2.5 py-1 rounded-full text-xs transition-all flex items-center gap-1 ${filterRating === r ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}>
                {r}<Star className="w-2.5 h-2.5 fill-current" />
              </button>
            ))}
          </div>

          {/* Conversation list */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {conversations.length === 0
                  ? "No conversations yet. Install the widget on your site to start collecting chats."
                  : "No conversations match your filters."}
              </p>
            </div>
          ) : (
            <div className="space-y-2 lg:flex-1 lg:min-h-0 lg:overflow-y-auto scrollbar-hide lg:pr-1">
              {filtered.map((conv, i) => {
                const visitorLabel = getVisitorLabel(conv);
                const rating = conv.satisfactionRating ?? 0;
                return (
                  <motion.div key={conv.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}
                    onClick={() => setSelectedId(conv.id)}
                    className={`p-3 rounded-xl cursor-pointer transition-all duration-200 border ${selectedId === conv.id ? "bg-primary/10 border-primary/30" : "glass-card border-border/40 hover:border-primary/20"}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">{visitorLabel}{conv.leadCompany ? <span className="text-muted-foreground font-normal"> · {conv.leadCompany}</span> : null}</div>
                          <div className="text-xs text-muted-foreground truncate">{conv.leadEmail ?? "Visitante sin registrar"}</div>
                        </div>
                      </div>
                      {rating > 0 && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star key={j} className={`w-2.5 h-2.5 ${j < rating ? "text-yellow-400 fill-yellow-400" : "text-muted/20"}`} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {conv.isLead && <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs px-1.5 py-0">Lead</Badge>}
                      {rating > 0 && rating <= 2 && <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-xs px-1.5 py-0">Low rating</Badge>}
                      <span className="text-xs text-muted-foreground ml-auto">{timeAgo(conv.createdAt)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-3 lg:min-h-0 lg:overflow-y-auto scrollbar-hide lg:pr-1">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
              {/* Header */}
              <Card className="glass-card border-border/40">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{getVisitorLabel(selected)}</div>
                      {selected.leadEmail && (
                        <div className="text-xs text-emerald-400 mt-0.5 truncate">{selected.leadEmail}{selected.leadName ? ` — ${selected.leadName}` : ""}{(selected as ConvRow).leadCompany ? ` · ${(selected as ConvRow).leadCompany}` : ""}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1 truncate" title={selected.pageUrl ?? "/"}>
                        Page: {(() => { try { return new URL(selected.pageUrl ?? "/", "https://x").pathname; } catch { return selected.pageUrl ?? "/"; } })()}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {(selected.satisfactionRating ?? 0) > 0 && (
                        <div className="flex items-center gap-1 justify-end mb-1">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star key={j} className={`w-3 h-3 ${j < (selected.satisfactionRating ?? 0) ? "text-yellow-400 fill-yellow-400" : "text-muted/20"}`} />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />{formatDuration(selected.duration)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Messages */}
              <Card className="glass-card border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Transcript ({selectedMessages.length} messages)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedMessages.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No messages recorded for this conversation.</p>
                  ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-hide pr-1">
                      {selectedMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${msg.role === "user" ? "lynx-gradient text-white rounded-tr-sm" : "bg-muted/50 text-foreground rounded-tl-sm"}`}>
                            {msg.content}
                            <div className={`text-xs mt-1 ${msg.role === "user" ? "text-white/60" : "text-muted-foreground"}`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="glass-card rounded-2xl h-64 flex items-center justify-center text-center p-8">
              <div>
                <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a conversation to view the transcript</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

export default function Conversations() {
  return <ConversationsContent />;
}

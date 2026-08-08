import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  GraduationCap, Plus, Trash2, Save, Send, Sparkles, Lock, BookOpen, MessageSquare,
} from "lucide-react";

type KbEntry = { title: string; content: string };
type TestMsg = { role: "user" | "assistant"; content: string };

export default function DashboardTraining() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.training.get.useQuery();
  const { data: chatbot } = trpc.chatbotConfig.get.useQuery();

  const [instructions, setInstructions] = useState("");
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Test chat state
  const [testMessages, setTestMessages] = useState<TestMsg[]>([]);
  const [testInput, setTestInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (data) {
      setInstructions(data.customInstructions ?? "");
      setEntries(data.knowledgeBase ?? []);
    }
  }, [data]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [testMessages]);

  const limits = data?.limits;
  const planBlocked = limits && !limits.instructionsEnabled;
  const kbBlocked = limits && !limits.knowledgeEnabled;

  const saveMutation = trpc.training.update.useMutation({
    onSuccess: () => {
      setDirty(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      utils.training.get.invalidate();
    },
  });

  const testChatMutation = trpc.chatbot.chat.useMutation({
    onSuccess: (res) => {
      setTestMessages((prev) => [...prev, { role: "assistant", content: typeof res.reply === "string" ? res.reply : JSON.stringify(res.reply) }]);
    },
    onError: () => {
      setTestMessages((prev) => [...prev, { role: "assistant", content: "Error: could not get a reply. Try again." }]);
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      customInstructions: instructions,
      ...(limits?.knowledgeEnabled ? { knowledgeBase: entries } : {}),
    });
  };

  const handleAddEntry = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    if (limits && entries.length >= limits.maxKnowledgeEntries) return;
    setEntries((prev) => [...prev, { title: newTitle.trim(), content: newContent.trim() }]);
    setNewTitle("");
    setNewContent("");
    setDirty(true);
  };

  const handleRemoveEntry = (idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const handleTestSend = () => {
    const text = testInput.trim();
    if (!text || testChatMutation.isPending) return;
    setTestMessages((prev) => [...prev, { role: "user", content: text }]);
    setTestInput("");
    testChatMutation.mutate({
      message: text,
      history: testMessages.slice(-10),
      chatbotName: chatbot?.name ?? undefined,
    });
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" /> Training
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Teach your chatbot how to behave and what it knows. Changes apply to your live widget instantly after saving.
            </p>
          </div>
          {!planBlocked && (
            <Button onClick={handleSave} disabled={saveMutation.isPending || (!dirty && !savedFlash)} className="gap-2">
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? "Saving..." : savedFlash ? "Saved ✓" : "Save changes"}
            </Button>
          )}
        </div>

        {/* Free plan upsell */}
        {planBlocked && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-8 text-center space-y-3">
              <Lock className="w-8 h-8 mx-auto text-primary" />
              <p className="font-medium">Training is available on paid plans</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Upgrade to add custom instructions and a knowledge base so your chatbot answers exactly the way your business needs.
              </p>
              <Button onClick={() => navigate("/dashboard/billing")}>Upgrade plan</Button>
            </CardContent>
          </Card>
        )}

        {!planBlocked && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* ── Left column: training editors ── */}
            <div className="space-y-6">
              {/* Custom instructions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Custom instructions
                    <Badge variant="outline" className="ml-auto font-normal">
                      {instructions.length}/{limits?.maxInstructionsChars}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    value={instructions}
                    maxLength={limits?.maxInstructionsChars}
                    onChange={(e) => { setInstructions(e.target.value); setDirty(true); }}
                    placeholder={"Example:\n- Always answer in Spanish, friendly tone.\n- Our support hours are Mon-Fri 9am-6pm.\n- Never promise refunds; direct refund questions to support@mysite.com."}
                    className="h-[220px] max-h-[220px] overflow-y-auto resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    These rules have top priority: tone, language, what to say and what to avoid.
                  </p>
                </CardContent>
              </Card>

              {/* Knowledge base */}
              <Card className={kbBlocked ? "opacity-80" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" /> Knowledge base
                    {!kbBlocked && (
                      <Badge variant="outline" className="ml-auto font-normal">
                        {entries.length}/{limits?.maxKnowledgeEntries} entries
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {kbBlocked ? (
                    <div className="text-center py-6 space-y-2">
                      <Lock className="w-6 h-6 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        The knowledge base is available on Embedded and White-Label plans.
                      </p>
                      <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/billing")}>
                        Upgrade
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Existing entries */}
                      {entries.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No entries yet. Add facts your chatbot must answer with confidence: hours, shipping, policies, pricing, FAQs.
                        </p>
                      )}
                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        {entries.map((entry, idx) => (
                          <div key={idx} className="flex items-start gap-2 rounded-md border border-border/50 p-3 bg-muted/20">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{entry.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{entry.content}</p>
                            </div>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveEntry(idx)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Add entry */}
                      <div className="space-y-2 border-t border-border/40 pt-4">
                        <Label className="text-xs">New entry</Label>
                        <Input
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Title (e.g. Shipping times)"
                          maxLength={120}
                          className="text-sm"
                        />
                        <Textarea
                          value={newContent}
                          onChange={(e) => setNewContent(e.target.value)}
                          placeholder="Answer the chatbot should give (e.g. We ship within 24-48h across the US, free over $50)."
                          maxLength={2000}
                          className="h-[140px] max-h-[140px] overflow-y-auto resize-none text-sm"
                        />
                        <Button
                          size="sm" variant="secondary" className="gap-1.5"
                          onClick={handleAddEntry}
                          disabled={!newTitle.trim() || !newContent.trim() || (limits ? entries.length >= limits.maxKnowledgeEntries : false)}
                        >
                          <Plus className="w-3.5 h-3.5" /> Add entry
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Right column: live test chat ── */}
            <Card className="flex flex-col xl:sticky xl:top-6 h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" /> Test your chatbot
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Save your changes first, then chat here — this uses your real training and site knowledge.
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="border border-border/40 rounded-lg bg-muted/10 h-[380px] overflow-y-auto p-3 space-y-2">
                  {testMessages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center pt-16">
                      Ask something a visitor would ask —<br />"What are your hours?", "Do you ship internationally?"
                    </p>
                  )}
                  {testMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                        m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {testChatMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-xl px-3 py-2 text-sm text-muted-foreground animate-pulse">
                        Typing...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTestSend(); } }}
                    placeholder="Type a test message..."
                    className="text-sm"
                  />
                  <Button size="icon" onClick={handleTestSend} disabled={!testInput.trim() || testChatMutation.isPending}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {testMessages.length > 0 && (
                  <Button variant="ghost" size="sm" className="self-start text-xs" onClick={() => setTestMessages([])}>
                    Clear conversation
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    </DashboardShell>
  );
}

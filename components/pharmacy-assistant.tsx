"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { pageContextFromPathname } from "@/lib/ai/page-context";
import { getSuggestedQuestions } from "@/lib/ai/suggestions";

type ChatMsg = { role: "user" | "assistant"; content: string };

type PharmacyAssistantCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  ask: (text: string) => void;
};

const PharmacyAssistantContext = createContext<PharmacyAssistantCtx | null>(
  null,
);

export function usePharmacyAssistant() {
  const ctx = useContext(PharmacyAssistantContext);
  if (!ctx) {
    throw new Error("usePharmacyAssistant must be used within PharmacyAssistantProvider");
  }
  return ctx;
}

export function PharmacyAssistantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<string | null>(null);
  const ask = useCallback((text: string) => {
    setPrefill(text);
    setOpen(true);
  }, []);

  const value = useMemo(
    (): PharmacyAssistantCtx => ({ open, setOpen, ask }),
    [ask, open],
  );
  return (
    <PharmacyAssistantContext.Provider value={value}>
      {children}
      <PharmacyAssistantDock prefill={prefill} onPrefillUsed={() => setPrefill(null)} />
    </PharmacyAssistantContext.Provider>
  );
}

function PharmacyAssistantDock({
  prefill,
  onPrefillUsed,
}: {
  prefill: string | null;
  onPrefillUsed: () => void;
}) {
  const pathname = usePathname();
  const pageContext = pageContextFromPathname(pathname);
  const suggestions = getSuggestedQuestions(pageContext);
  const { open, setOpen } = usePharmacyAssistant();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!prefill) return;
    setInput(prefill);
    onPrefillUsed();
  }, [onPrefillUsed, prefill]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const nextUser: ChatMsg = { role: "user", content: trimmed };
      const thread: ChatMsg[] = [...messages, nextUser];
      setMessages(thread);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            pageContext,
            messages: thread.map(({ role, content }) => ({ role, content })),
          }),
        });
        const data = (await res.json()) as { message?: string; error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Request failed");
        }
        const reply = data.message?.trim() ?? "";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: reply || "(No response)",
          },
        ]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, pageContext],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  return (
    <>
      <Button
        type="button"
        className={cn(
          "fixed bottom-6 right-6 z-40 h-12 gap-2 rounded-full px-4 shadow-lg",
          "md:bottom-8 md:right-8",
        )}
        onClick={() => setOpen(true)}
        aria-label="Open Ask my pharmacy"
      >
        <MessageCircle className="size-5 shrink-0" />
        <span className="text-sm font-semibold">Ask pharmacy</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex h-full max-h-dvh w-full flex-col gap-0 p-0 sm:max-w-lg"
          showCloseButton
        >
          <SheetHeader className="border-b border-border/60 px-4 py-4 text-left">
            <SheetTitle>Ask my pharmacy</SheetTitle>
            <SheetDescription>
              Answers use your live inventory and sales data for this workspace.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100dvh-13rem)] px-4">
            <div className="flex flex-col gap-3 py-4">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Ask anything about today’s sales, stock, or drugs. Suggestions
                  below match this page.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={`${i}-${m.role}`}
                  className={cn(
                    "max-w-[95%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto border border-border/80 bg-muted/50",
                  )}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="mr-auto rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                  Thinking…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <div className="border-t border-border/60 px-4 py-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={loading}
                  onClick={() => setInput(s)}
                  className="rounded-full border border-border/80 bg-background px-3 py-1 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <form onSubmit={onSubmit} className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about sales, inventory, or drugs…"
                className="min-h-[80px] flex-1 resize-none"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                className="h-[80px] shrink-0"
                disabled={loading || !input.trim()}
                aria-label="Send"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

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
  draft: string;
  setDraft: (text: string) => void;
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
  const [draft, setDraft] = useState("");
  const ask = useCallback((text: string) => {
    setDraft(text);
    setOpen(true);
  }, []);

  const value = useMemo(
    (): PharmacyAssistantCtx => ({ open, setOpen, draft, setDraft, ask }),
    [ask, draft, open],
  );
  return (
    <PharmacyAssistantContext.Provider value={value}>
      {children}
      <PharmacyAssistantDock />
    </PharmacyAssistantContext.Provider>
  );
}

function PharmacyAssistantDock() {
  const pathname = usePathname();
  const pageContext = pageContextFromPathname(pathname);
  const suggestions = getSuggestedQuestions(pageContext);
  const { open, setOpen, draft: input, setDraft: setInput } = usePharmacyAssistant();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
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
  }

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
          className="flex h-dvh max-h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          showCloseButton
        >
          <SheetHeader className="shrink-0 border-b border-border/60 px-4 py-4 pr-14 text-left">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageCircle className="size-4" aria-hidden="true" />
              </span>
              <SheetTitle>Ask my pharmacy</SheetTitle>
            </div>
            <SheetDescription>
              Answers use your live inventory and sales data for this workspace.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="min-h-0 flex-1 bg-muted/15 px-4">
            <div className="flex min-h-full flex-col gap-3 py-5">
              {messages.length === 0 && (
                <div className="my-auto py-10 text-center">
                  <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MessageCircle className="size-5" aria-hidden="true" />
                  </span>
                  <p className="mx-auto mt-4 max-w-xs text-sm font-medium text-foreground">
                    What would you like to know?
                  </p>
                  <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-muted-foreground">
                    Ask about today’s sales, stock levels, expiring batches, or drugs.
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={`${i}-${m.role}`}
                  className={cn(
                    "max-w-[90%] break-words whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
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

          <div className="shrink-0 border-t border-border/60 bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.04)]">
            <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={loading}
                  onClick={() => setInput(s)}
                  className="shrink-0 rounded-full border border-border/80 bg-background px-3 py-1.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <form onSubmit={onSubmit} className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about sales, inventory, or drugs…"
                rows={2}
                className="max-h-32 min-h-14 flex-1 resize-none rounded-xl py-2.5"
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
                className="size-11 shrink-0 rounded-xl"
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

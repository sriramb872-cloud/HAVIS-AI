import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Loader2, User, Globe, Link2 } from "lucide-react";
import { aiApi } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

const AISearch = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    const query = input.trim();
    // Phase 4: Basic Input Validation
    if (!query || query.length < 5) {
      toast.error("Please enter a search query with at least 5 characters.");
      return;
    }
    if (loading) return;
    
    const userMsg: Message = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    
    try {
      const response = await aiApi.assistant("ai-search", query);
      
      if (response.status === "error") {
        throw new Error(response.error || response.message || "Failed to get response");
      }
      
      const assistantMsg: Message = { 
        role: "assistant", 
        content: response.data.answer,
        sources: response.data.sources || []
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      console.error("AI Search Error:", e);
      toast.error(e.message || "AI Engine is temporarily busy. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-10rem)]">
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-bold mb-1 tracking-tight">AI Knowledge Engine</h1>
          <p className="text-muted-foreground text-lg italic">Instant, structured, and deep-researched answers to any query.</p>
        </div>

        <Card className="glass-card flex-1 flex flex-col min-h-0 border-0 shadow-2xl relative overflow-hidden">
          <CardContent className="flex-1 overflow-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-primary/10">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-40 hover:opacity-100 transition-opacity duration-500">
                <div className="p-6 rounded-3xl bg-primary/5 mb-6 animate-pulse">
                  <Globe className="h-12 w-12 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-2xl mb-2 text-card-foreground">Global Intelligence Ready</h3>
                <p className="text-muted-foreground max-w-sm text-lg">Ask about complex algorithms, physics, historical facts, or career paths.</p>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`p-2.5 rounded-2xl h-10 w-10 flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === "assistant" ? "bg-primary/20" : "bg-accent/20"
                }`}>
                  {msg.role === "assistant" ? <Bot className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-accent" />}
                </div>
                
                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`inline-block rounded-2xl px-5 py-4 text-base leading-relaxed ${
                    msg.role === "user"
                      ? "gradient-primary text-primary-foreground shadow-lg"
                      : "bg-secondary/50 text-secondary-foreground border border-border/50 backdrop-blur-md"
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                  
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {msg.sources.map((source, idx) => (
                        <Badge key={idx} variant="outline" className="text-[10px] bg-secondary/30 flex items-center gap-1 py-1">
                          <Link2 className="h-3 w-3" /> {source}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-4">
                <div className="p-2.5 rounded-2xl h-10 w-10 bg-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="bg-secondary/50 rounded-2xl px-6 py-4 border border-border/50 animate-pulse">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} className="h-1" />
          </CardContent>

          <div className="p-6 bg-background/80 backdrop-blur-xl border-t border-border/30">
            <div className="relative group">
              <Input
                placeholder="Type your question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="bg-secondary/30 border-border/40 h-14 pl-6 pr-16 text-lg focus-visible:ring-primary/20 rounded-2xl transition-all"
                disabled={loading}
              />
              <Button 
                onClick={handleSend} 
                disabled={!input.trim() || loading} 
                className="absolute right-2 top-1/2 -translate-y-1/2 gradient-primary text-primary-foreground h-10 w-10 p-0 rounded-xl shadow-lg hover:scale-105 transition-transform"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AISearch;

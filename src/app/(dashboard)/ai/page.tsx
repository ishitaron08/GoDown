"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { toast } from "sonner";
import { Bot, Send, Loader2, User, TrendingUp, AlertTriangle, CheckCircle, Info, Lock } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ForecastItem {
  productName: string;
  currentStock: number;
  predictedNext7Days: number;
  suggestedRestock: number;
  riskLevel: "high" | "medium" | "low";
}

const suggestions = [
  "Which products are low on stock?",
  "Which GoDown has the most inventory?",
  "What is the total inventory value?",
  "Give me a complete warehouse status summary.",
  "Which products need restocking urgently?",
  "How many orders are pending?",
];

const riskColors: Record<string, { bg: string; text: string; icon: any }> = {
  high: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-600 dark:text-red-400", icon: AlertTriangle },
  medium: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400", icon: Info },
  low: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle },
};

export default function AIPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<"chat" | "forecast">("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi. I'm your GoDown AI assistant. Ask me anything about your inventory — stock levels, reorder suggestions, or warehouse insights.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastItem[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastGenerated, setForecastGenerated] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 🔒 Check if user has permission to access AI
  const hasAIAccess = ["admin", "manager"].includes(session?.user?.role || "");

  const generateForecast = async () => {
    setForecastLoading(true);
    try {
      const res = await axios.post("/api/ai/forecast");
      setForecastData(res.data.forecast || []);
      setForecastGenerated(res.data.generatedAt);
      toast.success("Demand forecast generated");
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to generate forecast";
      const isForbidden = err?.response?.status === 403;
      if (isForbidden) {
        toast.error("Permission denied: Forecasting requires Admin/Manager role");
      } else {
        toast.error(msg);
      }
    } finally {
      setForecastLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (question?: string) => {
    const q = question ?? input.trim();
    if (!q) return;

    const newMessages: Message[] = [...messages, { role: "user", content: q }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("/api/ai", {
        action: "ask",
        payload: { question: q },
      });
      setMessages([
        ...newMessages,
        { role: "assistant", content: res.data.answer },
      ]);
    } catch (err: any) {
      const serverMsg = err?.response?.data?.error;
      const isForbidden = err?.response?.status === 403;
      const isQuota = err?.response?.data?.code === "quota_exceeded" || err?.response?.status === 402;
      const displayMsg = isForbidden
        ? `🔒 ${serverMsg || "You don't have permission to use AI features"}`
        : isQuota
        ? `⚠️ OpenAI API quota exceeded. The AI features require a valid OpenAI API key with available credits. Please update your API key in the .env.local file or add credits at https://platform.openai.com/account/billing`
        : serverMsg
          ? `Error: ${serverMsg}`
          : "Sorry, I encountered an error. Please try again.";
      toast.error(isForbidden ? "Permission denied" : isQuota ? "OpenAI quota exceeded" : "AI request failed");
      setMessages([
        ...newMessages,
        { role: "assistant", content: displayMsg },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">AI Assistant</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Powered by OpenAI — chat or forecast demand
        </p>
      </div>

      {/* 🔒 Permission Guard */}
      {!hasAIAccess ? (
        <div className="surface p-8 flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 flex items-center justify-center bg-red-50">
            <Lock className="h-5 w-5 text-red-600" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-foreground mb-1">Access Restricted</h2>
            <p className="text-[13px] text-muted-foreground">
              AI features are only available to Admin and Manager roles.
            </p>
            <p className="text-[12px] text-muted-foreground mt-2">
              Your current role: <span className="font-medium capitalize">{session?.user?.role}</span>
            </p>
          </div>
        </div>
      ) : (
        <>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("chat")}
          className={`px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
            tab === "chat"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bot className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" strokeWidth={1.5} />
          Chat
        </button>
        <button
          onClick={() => setTab("forecast")}
          className={`px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
            tab === "forecast"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" strokeWidth={1.5} />
          Demand Forecast
        </button>
      </div>

      {tab === "chat" ? (
        <>
          {/* Chat */}
          <div className="surface flex flex-col h-[520px]">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-3 animate-slide-up ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {m.role === "assistant" && (
                    <div className="h-7 w-7 flex items-center justify-center bg-foreground text-background shrink-0">
                      <Bot className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-4 py-3 text-[13px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-foreground text-background"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.role === "user" && (
                    <div className="h-7 w-7 flex items-center justify-center bg-secondary shrink-0">
                      <User className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start animate-fade-in">
                  <div className="h-7 w-7 flex items-center justify-center bg-foreground text-background">
                    <Bot className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </div>
                  <div className="bg-secondary px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-black/[0.06] p-4 flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && sendMessage()
                }
                placeholder="Ask about inventory..."
                className="flex-1 px-4 py-2.5 border border-border bg-white text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/20 transition-colors"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="h-10 w-10 flex items-center justify-center bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30 transition-colors btn-press"
              >
                <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Suggestions */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground mb-3">
              Quick questions
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                  className="chip hover:bg-foreground hover:text-background transition-colors disabled:opacity-40 cursor-pointer btn-press"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Forecast Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-muted-foreground">
                AI analyzes your last 30 days of order data to predict demand for the next 7 days.
              </p>
              {forecastGenerated && (
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                  Last generated: {new Date(forecastGenerated).toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={generateForecast}
              disabled={forecastLoading}
              className="px-4 py-2 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 disabled:opacity-40 transition-colors btn-press flex items-center gap-2 shrink-0"
            >
              {forecastLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
              {forecastLoading ? "Analyzing..." : "Generate Forecast"}
            </button>
          </div>

          {forecastData.length > 0 ? (
            <div className="surface overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Product</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Current Stock</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Predicted 7d</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Restock Qty</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-center">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastData.map((item, i) => {
                    const rc = riskColors[item.riskLevel] || riskColors.low;
                    const RiskIcon = rc.icon;
                    return (
                      <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{item.productName}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{item.currentStock}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{item.predictedNext7Days}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{item.suggestedRestock}</td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${rc.bg} ${rc.text} mx-auto`}>
                            <RiskIcon className="h-3 w-3" strokeWidth={2} />
                            {item.riskLevel}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : !forecastLoading ? (
            <div className="surface p-12 flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 flex items-center justify-center bg-secondary">
                <TrendingUp className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <p className="text-[13px] text-muted-foreground">
                Click &quot;Generate Forecast&quot; to analyze demand patterns
              </p>
            </div>
          ) : (
            <div className="surface p-12 flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-[13px] text-muted-foreground">Analyzing order patterns with AI...</p>
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}

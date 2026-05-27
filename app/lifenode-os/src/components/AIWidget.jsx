"use client";

import React, { useMemo, useState } from "react";
import { Sparkles, Send, Loader2, Mic, MicOff } from "lucide-react";

/**
 * Small chat widget that talks to /api/chat and scopes responses by `nodeContext`.
 */
export default function AIWidget({ nodeContext }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Ask me for lead follow-up next steps (who to contact, what to say, and when). I'll tailor it to your BizNode.",
    },
  ]);

  const systemPrompt = useMemo(() => {
    const context = nodeContext?.trim() || "General operations";
    return [
      "You are LifeNode OS, an operations-focused AI.",
      `Node context: ${context}`,
      "When responding to lead follow-up questions, give:",
      "1) A short recommended message (email/DM style)",
      "2) A suggested next action",
      "3) A follow-up timeline",
      "Keep it professional, concise, and actionable.",
    ].join("\n");
  }, [nodeContext]);

  function startVoiceInput() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      window.alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (event) => {
      const text = Array.from(event.results)
        .map((r) => r[0]?.transcript ?? "")
        .join("")
        .trim();
      if (text) setInput(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  }

  async function submit() {
    const text = input.trim();
    if (!text || isLoading) return;

    setError("");
    setIsLoading(true);

    const nextUserMsg = { role: "user", content: text };
    const nextMessages = [...messages, nextUserMsg];
    setMessages(nextMessages);
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "system", content: systemPrompt }, ...nextMessages],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "AI request failed");
      }

      const assistantReply = data?.reply || "No response returned.";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantReply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn't reach the AI engine right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-blue-600" />
        <div className="font-bold text-blue-600">Smart Triage AI</div>
      </div>

      <div className="space-y-3 mb-3">
        {messages.slice(-4).map((m, idx) => (
          <div
            key={`${m.role}-${idx}`}
            className={
              m.role === "assistant"
                ? "text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm leading-relaxed"
                : "text-slate-900 bg-white border border-slate-200 rounded-xl p-3 text-sm leading-relaxed"
            }
          >
            {m.content}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex gap-2 items-center"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Lead follow-up: what should I do next?"
          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="button"
          onClick={startVoiceInput}
          disabled={listening || isLoading}
          className={`px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center ${
            listening ? "ring-2 ring-rose-300" : ""
          }`}
          title={listening ? "Listening…" : "Speak your question"}
          aria-label="Voice input"
        >
          {listening ? <MicOff size={16} className="text-rose-600" /> : <Mic size={16} />}
        </button>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-3 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>

      {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}
    </div>
  );
}

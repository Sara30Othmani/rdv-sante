"use client";

import { useEffect, useRef, useState } from "react";
import { apiJson } from "@/lib/api";

type Message = {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  suggestions?: string[];
};

const INITIAL_SUGGESTIONS = [
  "Donnes-moi toutes les infos sur les seringues 5ml en stock.",
  "Quels sont les articles en rupture ou en stock bas ?",
  "Quels produits vont bientôt périmer ?",
  "Fais-moi un résumé du stock",
  "Où se trouve le Paracétamol ?",
];

export default function StockChatbotModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: `👋 Bonjour Docteur ! Je suis votre **Assistant IA de Stock**.

Posez-moi n'importe quelle question en langage naturel sur le stock du cabinet au lieu de chercher manuellement dans les filtres.

*Exemple : « Donnes-moi toutes les infos sur les seringues 5ml en stock. »*`,
      timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      suggestions: INITIAL_SUGGESTIONS,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (questionText?: string) => {
    const textToSend = (questionText || input).trim();
    if (!textToSend || isTyping) return;

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await apiJson<{ reply: string; suggestions?: string[] }>("/api/stock/assistant", {
        method: "POST",
        body: JSON.stringify({ query: textToSend }),
      });

      const botMessage: Message = {
        id: `b-${Date.now()}`,
        sender: "bot",
        text: res.reply,
        timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        suggestions: res.suggestions,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: `e-${Date.now()}`,
        sender: "bot",
        text: `⚠️ Erreur lors de la communication avec l'assistant : ${
          err.message || "Veuillez vérifier votre connexion."
        }`,
        timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        sender: "bot",
        text: "Conversation réinitialisée. Comment puis-je vous aider avec le stock du cabinet ?",
        timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        suggestions: INITIAL_SUGGESTIONS,
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="flex flex-col w-full max-w-2xl h-[680px] max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-white">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-inner">
              <span className="text-2xl">🤖</span>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-teal-700 rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Assistant IA de Stock</h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-white/20 rounded-full text-emerald-100 uppercase tracking-wider">
                  Cabinet Médical
                </span>
              </div>
              <p className="text-xs text-teal-100">
                Interrogation intelligente en langage naturel de vos stocks &amp; péremptions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearChat}
              title="Effacer la conversation"
              className="p-2 text-teal-100 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-xs font-medium"
            >
              🔄 Réinitialiser
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-teal-100 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              aria-label="Fermer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/70">
          {messages.map((m) => {
            const isBot = m.sender === "bot";
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isBot ? "justify-start" : "justify-end"} animate-in fade-in slide-in-from-bottom-1`}
              >
                {isBot && (
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 text-sm shadow-xs mt-1">
                    🤖
                  </div>
                )}
                <div className={`max-w-[85%] ${isBot ? "text-slate-800" : "text-white"}`}>
                  <div
                    className={`rounded-2xl p-4 text-sm leading-relaxed shadow-xs ${
                      isBot
                        ? "bg-white border border-slate-200/80 rounded-tl-xs whitespace-pre-line"
                        : "bg-teal-600 text-white rounded-tr-xs"
                    }`}
                  >
                    {m.text}
                  </div>
                  <div className={`mt-1 text-[11px] text-slate-400 px-1 ${isBot ? "text-left" : "text-right"}`}>
                    {m.timestamp}
                  </div>

                  {/* Suggestion Chips */}
                  {isBot && m.suggestions && m.suggestions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSend(s)}
                          disabled={isTyping}
                          className="text-xs font-medium px-3 py-1.5 rounded-full bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 shadow-2xs hover:border-teal-400 transition-all text-left"
                        >
                          💬 {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!isBot && (
                  <div className="w-8 h-8 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs mt-1">
                    Dr
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-3 items-center text-slate-500 text-xs">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center text-sm shadow-xs">
                🤖
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="ml-2 text-slate-500">L&apos;assistant analyse les stocks...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question (ex: Donnes-moi toutes les infos sur les seringues 5ml)..."
              disabled={isTyping}
              className="flex-1 px-4 py-3 text-sm bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-xs disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center gap-2 shrink-0"
            >
              <span>Envoyer</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
          <p className="mt-2 text-[11px] text-center text-slate-400">
            Assistant connecté à la base de données de stock du cabinet. Calcul en temps réel des péremptions &amp; consommation.
          </p>
        </div>
      </div>
    </div>
  );
}

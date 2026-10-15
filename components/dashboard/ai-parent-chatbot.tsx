"use client";

import { useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";

export function AIParentChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([
        { role: 'model', content: "Hello! I'm LUCY. You can ask me about your child's schedule, pending fees, or attendance." }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput("");
        const newHistory = [...messages, { role: 'user' as const, content: userMsg }];
        setMessages(newHistory);
        setLoading(true);

        try {
            const res = await fetch('/api/parent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    previousHistory: messages
                })
            });
            if (res.ok) {
                const data = await res.json() as { text?: string };
                setMessages([...newHistory, { role: 'model' as const, content: data.text || "No response received." }]);
            } else {
                setMessages([...newHistory, { role: 'model' as const, content: "I'm having trouble connecting to the school servers right now." }]);
            }
        } catch {
            setMessages([...newHistory, { role: 'model' as const, content: "Network error occurred." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-[calc(100vw-2rem)]">
            {isOpen ? (
                <Card className="w-[calc(100vw-2rem)] max-w-[360px] sm:w-[380px] md:w-[400px] h-[480px] sm:h-[500px] max-h-[85vh] flex flex-col shadow-2xl bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-4 bg-emerald-600 flex items-center justify-between text-white shadow-md z-10">
                        <div className="flex items-center gap-2 font-black italic text-lg">
                            <Sparkles className="w-5 h-5 text-emerald-200" />
                            LUCY AI
                        </div>
                        <Button variant="ghost" size="icon" className="hover:bg-emerald-700 text-white hover:text-white rounded-full h-8 w-8" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-zinc-950/50">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 shadow-md'}`}>
                                    <div className="prose dark:prose-invert prose-sm max-w-none">
                                        <ReactMarkdown>
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm text-slate-500 dark:text-zinc-500 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 animate-pulse text-emerald-600 dark:text-eduGreen-500" />
                                    <span>LUCY is thinking...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-slate-100 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 flex gap-2">
                        <Input
                            className="flex-1 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl text-slate-900 dark:text-white"
                            placeholder="Ask a question..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <Button size="icon" className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl" onClick={handleSend} disabled={loading || !input.trim()}>
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </Card>
            ) : (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-16 w-16 rounded-full bg-eduGreen-600 hover:bg-eduGreen-500 shadow-xl shadow-eduGreen-900/30 text-white animate-bounce 
                    shadow-[0_0_30px_rgba(59,214,141,0.5)] border-2 border-eduGreen-400 group"
                >
                    <MessageCircle className="w-7 h-7 group-hover:scale-110 transition-transform" />
                </Button>
            )}
        </div>
    );
}

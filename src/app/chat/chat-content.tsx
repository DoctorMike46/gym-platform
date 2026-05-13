"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    MessageCircle,
    Send,
    User,
    Search,
    Paperclip,
    ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
    getChatMessages,
    markConversationReadByTrainer,
    sendChatMessageFromTrainer,
} from "@/lib/actions/chat";

type ConversationRow = {
    client_id: number;
    client_nome: string;
    client_cognome: string;
    client_email: string;
    last_message: string;
    last_sender: string;
    last_at: Date | string;
    has_attachment: boolean;
    unread: number;
};

type ChatMessageRow = {
    id: number;
    sender_role: string;
    body: string;
    attachment_r2_key: string | null;
    attachment_mime_type: string | null;
    read_at: Date | string | null;
    created_at: Date | string;
};

function formatRelative(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    const diff = Date.now() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "ora";
    if (minutes < 60) return `${minutes}m fa`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h fa`;
    return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

function formatTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function ChatContent({
    conversations,
}: {
    conversations: ConversationRow[];
}) {
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [search, setSearch] = useState("");

    // Su desktop (md+) auto-seleziona la prima conversazione al mount.
    // Su mobile lasciamo null così l'utente vede prima la lista.
    useEffect(() => {
        if (typeof window === "undefined") return;
        const isDesktop = window.matchMedia("(min-width: 768px)").matches;
        if (isDesktop && conversations.length > 0) {
            setSelectedId(conversations[0].client_id);
        }
    }, [conversations]);

    const filtered = conversations.filter((c) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            `${c.client_nome} ${c.client_cognome}`
                .toLowerCase()
                .includes(q) ||
            c.client_email.toLowerCase().includes(q) ||
            c.last_message.toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    Chat
                </h1>
                <p className="text-slate-500 mt-1">
                    Comunica con i tuoi clienti in tempo reale.
                </p>
            </div>

            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden p-0">
                <div className="flex h-[calc(100vh-12rem)] md:h-[70vh] min-h-[500px]">
                    {/* Sidebar conversazioni — nascosta su mobile quando una è selezionata */}
                    <div
                        className={`${
                            selectedId !== null
                                ? "hidden md:flex"
                                : "flex"
                        } w-full md:w-72 lg:w-80 md:border-r border-slate-100 flex-col`}
                    >
                        <div className="p-3 border-b border-slate-100">
                            <div className="relative">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <Input
                                    placeholder="Cerca cliente…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 border-slate-200 shadow-none h-9"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {filtered.length === 0 ? (
                                <div className="p-8 text-center text-sm text-slate-500">
                                    {conversations.length === 0
                                        ? "Nessuna conversazione. Quando un cliente ti scriverà, apparirà qui."
                                        : "Nessun risultato."}
                                </div>
                            ) : (
                                filtered.map((c) => {
                                    const selected = c.client_id === selectedId;
                                    return (
                                        <button
                                            key={c.client_id}
                                            type="button"
                                            onClick={() =>
                                                setSelectedId(c.client_id)
                                            }
                                            className={`w-full text-left px-3 py-3 border-b border-slate-50 transition-colors flex gap-2 ${
                                                selected
                                                    ? "bg-slate-50/80"
                                                    : "hover:bg-slate-50"
                                            }`}
                                        >
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center brand-text shrink-0">
                                                <User size={18} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-semibold text-sm text-slate-900 truncate">
                                                        {c.client_nome}{" "}
                                                        {c.client_cognome}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 shrink-0">
                                                        {formatRelative(c.last_at)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 mt-0.5">
                                                    <span className="text-xs text-slate-500 truncate">
                                                        {c.last_sender ===
                                                        "trainer"
                                                            ? "Tu: "
                                                            : ""}
                                                        {c.last_message ||
                                                            (c.has_attachment
                                                                ? "📎 Allegato"
                                                                : "")}
                                                    </span>
                                                    {c.unread > 0 && (
                                                        <Badge className="brand-bg text-white h-5 px-1.5 text-[10px] tabular-nums">
                                                            {c.unread}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Vista chat — su mobile mostrata solo quando una è selezionata */}
                    <div
                        className={`${
                            selectedId === null ? "hidden md:flex" : "flex"
                        } flex-1 flex-col min-w-0`}
                    >
                        {selectedId ? (
                            <ConversationPane
                                clientId={selectedId}
                                clientName={
                                    conversations.find(
                                        (c) => c.client_id === selectedId
                                    )
                                        ? `${conversations.find((c) => c.client_id === selectedId)!.client_nome} ${conversations.find((c) => c.client_id === selectedId)!.client_cognome}`
                                        : "Cliente"
                                }
                                onBack={() => setSelectedId(null)}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                <MessageCircle
                                    className="text-slate-300"
                                    size={56}
                                    strokeWidth={1.5}
                                />
                                <p className="mt-4 text-slate-700 font-semibold">
                                    Nessuna conversazione selezionata
                                </p>
                                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                                    Quando un cliente ti scrive un messaggio,
                                    troverai qui la lista delle conversazioni
                                    attive.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}

function ConversationPane({
    clientId,
    clientName,
    onBack,
}: {
    clientId: number;
    clientName: string;
    onBack: () => void;
}) {
    const [messages, setMessages] = useState<ChatMessageRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState("");
    const [pending, startTransition] = useTransition();
    const scrollRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<NodeJS.Timeout | null>(null);
    const lastIdRef = useRef<number>(0);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setMessages([]);
        lastIdRef.current = 0;
        (async () => {
            try {
                const rows = await getChatMessages(clientId, undefined, 80);
                if (cancelled) return;
                setMessages(rows as ChatMessageRow[]);
                lastIdRef.current =
                    rows.length > 0 ? rows[rows.length - 1].id : 0;
                setLoading(false);
                await markConversationReadByTrainer(clientId);
                // Auto-scroll
                requestAnimationFrame(() => {
                    if (scrollRef.current) {
                        scrollRef.current.scrollTop =
                            scrollRef.current.scrollHeight;
                    }
                });
            } catch {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [clientId]);

    // Polling 3s per nuovi messaggi
    useEffect(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const rows = await getChatMessages(clientId, undefined, 30);
                const latest = rows[rows.length - 1];
                if (latest && latest.id > lastIdRef.current) {
                    setMessages(rows as ChatMessageRow[]);
                    lastIdRef.current = latest.id;
                    await markConversationReadByTrainer(clientId);
                    requestAnimationFrame(() => {
                        if (scrollRef.current) {
                            scrollRef.current.scrollTop =
                                scrollRef.current.scrollHeight;
                        }
                    });
                }
            } catch {
                // ignore
            }
        }, 3000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [clientId]);

    function onSend() {
        const text = input.trim();
        if (!text) return;
        startTransition(async () => {
            const r = await sendChatMessageFromTrainer(clientId, text);
            if (!r.success) {
                toast.error(r.error || "Errore");
                return;
            }
            setInput("");
            // Recarica per vedere subito
            const rows = await getChatMessages(clientId, undefined, 80);
            setMessages(rows as ChatMessageRow[]);
            lastIdRef.current =
                rows.length > 0 ? rows[rows.length - 1].id : 0;
            requestAnimationFrame(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop =
                        scrollRef.current.scrollHeight;
                }
            });
        });
    }

    return (
        <>
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/30 flex items-center gap-3">
                <Button
                    size="icon"
                    variant="ghost"
                    className="md:hidden h-9 w-9 -ml-2 shrink-0"
                    onClick={onBack}
                >
                    <ArrowLeft size={18} />
                </Button>
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center brand-text shrink-0">
                    <User size={18} />
                </div>
                <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">
                        {clientName}
                    </div>
                </div>
            </div>
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 bg-slate-50/30"
            >
                {loading ? (
                    <div className="flex items-center justify-center h-full text-sm text-slate-500">
                        Caricamento…
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                        <MessageCircle size={40} className="text-slate-300" />
                        <p className="mt-3 text-sm">
                            Nessun messaggio ancora. Scrivi il primo!
                        </p>
                    </div>
                ) : (
                    messages.map((m) => {
                        const mine = m.sender_role === "trainer";
                        return (
                            <div
                                key={m.id}
                                className={`flex mb-2 ${mine ? "justify-end" : "justify-start"}`}
                            >
                                <CardContent
                                    className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                                        mine
                                            ? "brand-bg text-white rounded-br-sm"
                                            : "bg-white border border-slate-200 text-slate-900 rounded-bl-sm"
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                        {m.body}
                                    </p>
                                    <div
                                        className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-slate-400"} flex items-center justify-end gap-1 tabular-nums`}
                                    >
                                        {formatTime(m.created_at)}
                                    </div>
                                </CardContent>
                            </div>
                        );
                    })
                )}
            </div>
            <div className="p-3 border-t border-slate-100 bg-white">
                <div className="flex gap-2 items-end">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 text-slate-500 hover:bg-slate-100 shrink-0"
                        disabled
                        title="Allegati (in arrivo)"
                    >
                        <Paperclip size={18} />
                    </Button>
                    <Input
                        placeholder="Scrivi un messaggio…"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                onSend();
                            }
                        }}
                        className="border-slate-200 shadow-none h-10"
                    />
                    <Button
                        onClick={onSend}
                        disabled={pending || !input.trim()}
                        className="brand-bg text-white h-10 px-4 gap-1.5 shrink-0"
                    >
                        <Send size={16} />
                        Invia
                    </Button>
                </div>
            </div>
        </>
    );
}

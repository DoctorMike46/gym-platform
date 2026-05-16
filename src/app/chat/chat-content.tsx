"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    getChatAttachmentDownloadUrl,
    getChatMessages,
    markConversationReadByTrainer,
    sendChatMessageFromTrainer,
    uploadChatAttachment,
} from "@/lib/actions/chat";
import { FileText, ImageIcon, X, Download as DownloadIcon } from "lucide-react";

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
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [sortBy, setSortBy] = useState<"recent" | "unread" | "name">("recent");

    // Su desktop (md+) auto-seleziona la prima conversazione al mount.
    // Su mobile lasciamo null così l'utente vede prima la lista.
    useEffect(() => {
        if (typeof window === "undefined") return;
        const isDesktop = window.matchMedia("(min-width: 768px)").matches;
        if (isDesktop && conversations.length > 0) {
            setSelectedId(conversations[0].client_id);
        }
    }, [conversations]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        let arr = conversations.filter((c) => {
            if (unreadOnly && c.unread <= 0) return false;
            if (!q) return true;
            return (
                `${c.client_nome} ${c.client_cognome}`
                    .toLowerCase()
                    .includes(q) ||
                c.client_email.toLowerCase().includes(q) ||
                c.last_message.toLowerCase().includes(q)
            );
        });

        if (sortBy === "name") {
            arr = [...arr].sort((a, b) =>
                `${a.client_nome} ${a.client_cognome}`.localeCompare(
                    `${b.client_nome} ${b.client_cognome}`,
                ),
            );
        } else if (sortBy === "unread") {
            arr = [...arr].sort((a, b) => {
                if (a.unread !== b.unread) return b.unread - a.unread;
                return new Date(b.last_at).getTime() - new Date(a.last_at).getTime();
            });
        }
        // "recent" → conversations è già ordinata dal server per last_at desc
        return arr;
    }, [conversations, search, unreadOnly, sortBy]);

    const totalUnread = useMemo(
        () => conversations.reduce((acc, c) => acc + (c.unread ?? 0), 0),
        [conversations],
    );

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
                        <div className="p-3 border-b border-slate-100 space-y-2">
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
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setUnreadOnly((v) => !v)}
                                    className={`flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-semibold transition-colors ${
                                        unreadOnly
                                            ? "brand-bg text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    Non letti
                                    {totalUnread > 0 && (
                                        <span
                                            className={`tabular-nums ${
                                                unreadOnly
                                                    ? "text-white/90"
                                                    : "text-slate-500"
                                            }`}
                                        >
                                            {totalUnread}
                                        </span>
                                    )}
                                </button>
                                <Select
                                    value={sortBy}
                                    onValueChange={(v) =>
                                        setSortBy(v as typeof sortBy)
                                    }
                                >
                                    <SelectTrigger className="h-7 flex-1 border-slate-200 shadow-none text-[11px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="recent" className="text-xs">
                                            Recenti
                                        </SelectItem>
                                        <SelectItem value="unread" className="text-xs">
                                            Non letti per primi
                                        </SelectItem>
                                        <SelectItem value="name" className="text-xs">
                                            Nome A→Z
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
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
    const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
    const [pendingAttachmentPreview, setPendingAttachmentPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<NodeJS.Timeout | null>(null);
    const lastIdRef = useRef<number>(0);

    // Cleanup preview blob URL quando cambia allegato
    useEffect(() => {
        return () => {
            if (pendingAttachmentPreview) {
                URL.revokeObjectURL(pendingAttachmentPreview);
            }
        };
    }, [pendingAttachmentPreview]);

    // Pre-fetch URL firmati per i messaggi con allegato immagine
    useEffect(() => {
        const missing = messages.filter(
            (m) =>
                m.attachment_r2_key &&
                m.attachment_mime_type?.startsWith("image/") &&
                !imageUrls[m.id],
        );
        if (missing.length === 0) return;
        let cancelled = false;
        (async () => {
            const entries = await Promise.all(
                missing.map(async (m) => {
                    const r = await getChatAttachmentDownloadUrl(
                        m.attachment_r2_key as string,
                    );
                    return r.success ? ([m.id, r.url] as const) : null;
                }),
            );
            if (cancelled) return;
            setImageUrls((prev) => {
                const next = { ...prev };
                for (const e of entries) {
                    if (e) next[e[0]] = e[1];
                }
                return next;
            });
        })();
        return () => {
            cancelled = true;
        };
    }, [messages, imageUrls]);

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

    function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        e.target.value = ""; // permette di riselezionare stesso file
        if (!f) return;
        if (f.size > 25 * 1024 * 1024) {
            toast.error("File troppo grande (max 25MB)");
            return;
        }
        setPendingAttachment(f);
        if (f.type.startsWith("image/")) {
            setPendingAttachmentPreview(URL.createObjectURL(f));
        } else {
            setPendingAttachmentPreview(null);
        }
    }

    function clearAttachment() {
        if (pendingAttachmentPreview) {
            URL.revokeObjectURL(pendingAttachmentPreview);
        }
        setPendingAttachment(null);
        setPendingAttachmentPreview(null);
    }

    async function openAttachment(r2Key: string) {
        const r = await getChatAttachmentDownloadUrl(r2Key);
        if (r.success) {
            window.open(r.url, "_blank", "noopener,noreferrer");
        } else {
            toast.error(r.error || "Impossibile aprire l'allegato");
        }
    }

    function onSend() {
        const text = input.trim();
        if (!text && !pendingAttachment) return;
        startTransition(async () => {
            let attachmentR2Key: string | undefined;
            let attachmentMimeType: string | undefined;

            if (pendingAttachment) {
                setUploading(true);
                try {
                    const fd = new FormData();
                    fd.append("client_id", String(clientId));
                    fd.append("file", pendingAttachment);
                    const up = await uploadChatAttachment(fd);
                    if (!up.success) {
                        toast.error(up.error || "Errore upload");
                        setUploading(false);
                        return;
                    }
                    attachmentR2Key = up.r2_key;
                    attachmentMimeType = up.mime_type;
                } finally {
                    setUploading(false);
                }
            }

            const r = await sendChatMessageFromTrainer(clientId, text, {
                attachmentR2Key,
                attachmentMimeType,
            });
            if (!r.success) {
                toast.error(r.error || "Errore");
                return;
            }
            setInput("");
            clearAttachment();
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
                        const hasAttachment = !!m.attachment_r2_key;
                        const isImage = m.attachment_mime_type?.startsWith("image/");
                        const imgUrl = isImage ? imageUrls[m.id] : undefined;
                        return (
                            <div
                                key={m.id}
                                className={`flex mb-2 ${mine ? "justify-end" : "justify-start"}`}
                            >
                                <CardContent
                                    className={`max-w-[70%] px-3 py-2 rounded-2xl ${
                                        mine
                                            ? "brand-bg text-white rounded-br-sm"
                                            : "bg-white border border-slate-200 text-slate-900 rounded-bl-sm"
                                    }`}
                                >
                                    {hasAttachment && isImage && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                m.attachment_r2_key &&
                                                openAttachment(m.attachment_r2_key)
                                            }
                                            className="block mb-1 rounded-lg overflow-hidden bg-slate-200/40"
                                        >
                                            {imgUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={imgUrl}
                                                    alt="Allegato"
                                                    className="max-h-64 w-auto object-cover"
                                                />
                                            ) : (
                                                <div className="h-32 w-48 flex items-center justify-center text-slate-400">
                                                    <ImageIcon size={28} />
                                                </div>
                                            )}
                                        </button>
                                    )}
                                    {hasAttachment && !isImage && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                m.attachment_r2_key &&
                                                openAttachment(m.attachment_r2_key)
                                            }
                                            className={`flex items-center gap-2 mb-1 px-2 py-1.5 rounded-md text-xs ${
                                                mine
                                                    ? "bg-white/15 hover:bg-white/25"
                                                    : "bg-slate-100 hover:bg-slate-200"
                                            }`}
                                        >
                                            <FileText size={16} />
                                            <span className="truncate max-w-[200px]">
                                                {(m.attachment_r2_key ?? "")
                                                    .split("/")
                                                    .pop()
                                                    ?.replace(/^\d+_/, "")}
                                            </span>
                                            <DownloadIcon size={12} className="opacity-70" />
                                        </button>
                                    )}
                                    {m.body && (
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                            {m.body}
                                        </p>
                                    )}
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
            <div className="p-3 border-t border-slate-100 bg-white space-y-2">
                {pendingAttachment && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                        {pendingAttachmentPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={pendingAttachmentPreview}
                                alt="Anteprima"
                                className="h-12 w-12 object-cover rounded-md"
                            />
                        ) : (
                            <div className="h-12 w-12 flex items-center justify-center rounded-md bg-slate-200 text-slate-500">
                                <FileText size={20} />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-900 truncate">
                                {pendingAttachment.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                                {(pendingAttachment.size / 1024).toFixed(0)} KB
                                {uploading && " · caricamento…"}
                            </div>
                        </div>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-rose-600"
                            onClick={clearAttachment}
                            disabled={uploading || pending}
                        >
                            <X size={16} />
                        </Button>
                    </div>
                )}
                <div className="flex gap-2 items-end">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf,video/mp4,video/quicktime"
                        className="hidden"
                        onChange={onFilePicked}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 text-slate-500 hover:bg-slate-100 shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={pending || uploading}
                        title="Allega file"
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
                        disabled={uploading}
                    />
                    <Button
                        onClick={onSend}
                        disabled={
                            pending ||
                            uploading ||
                            (!input.trim() && !pendingAttachment)
                        }
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

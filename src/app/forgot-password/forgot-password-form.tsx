"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, CheckCircle2 } from "lucide-react";
import { requestPasswordReset } from "@/lib/actions/auth-reset";

export default function ForgotPasswordForm({ primaryColor }: { primaryColor: string }) {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const result = await requestPasswordReset(email);
            if (result.success) {
                setSuccess(true);
            } else {
                setError(result.error || "Qualcosa è andato storto. Riprova.");
            }
        } catch {
            setError("Errore di connessione. Riprova.");
        } finally {
            setIsLoading(false);
        }
    }

    if (success) {
        return (
            <div className="text-center py-6 animate-in fade-in zoom-in duration-500">
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20"
                    style={{ backgroundColor: "#10b981" }}
                >
                    <CheckCircle2 size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Email Inviata!</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                    Se l'indirizzo <strong>{email}</strong> è registrato, riceverai a breve un link per reimpostare la tua password.
                </p>
                <p className="text-slate-400 text-xs mt-8">
                    Controlla anche la cartella spam se non la ricevi entro pochi minuti.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                    Email
                </Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="trainer@esempio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-offset-0"
                    style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
                    autoComplete="email"
                />
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl px-4 py-3">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-brand-500/10"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <>
                        <Send size={18} />
                        Invia Link di Ripristino
                    </>
                )}
            </button>
        </form>
    );
}

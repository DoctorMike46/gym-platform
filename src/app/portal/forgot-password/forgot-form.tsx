"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, CheckCircle2 } from "lucide-react";
import { requestClientPasswordReset } from "@/lib/actions/portal-auth";

export default function ForgotForm({ primaryColor }: { primaryColor: string }) {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        try {
            const result = await requestClientPasswordReset(email);
            if (result.success) setSuccess(true);
            else setError(result.error || "Qualcosa è andato storto.");
        } catch {
            setError("Errore di connessione. Riprova.");
        } finally {
            setIsLoading(false);
        }
    }

    if (success) {
        return (
            <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg" style={{ backgroundColor: "#10b981" }}>
                    <CheckCircle2 size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Email Inviata!</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                    Se l&apos;indirizzo <strong>{email}</strong> è registrato, riceverai un link per reimpostare la password.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-xl border-slate-200 focus-visible:ring-2"
                    style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
                    autoComplete="email"
                />
            </div>
            {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl px-4 py-3">{error}</div>}
            <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
            >
                {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={18} /> Invia Link</>}
            </button>
        </form>
    );
}

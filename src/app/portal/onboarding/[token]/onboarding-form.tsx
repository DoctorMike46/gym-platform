"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Eye,
    EyeOff,
    ArrowRight,
    CheckCircle2,
    Smartphone,
    Download,
} from "lucide-react";
import { completeOnboarding } from "@/lib/actions/portal-auth";
import { validatePassword } from "@/lib/password-policy";
import PasswordStrength from "@/components/ui/password-strength";

export default function OnboardingForm({
    token,
    email,
    primaryColor,
}: {
    token: string;
    email: string;
    primaryColor: string;
}) {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [acceptHealth, setAcceptHealth] = useState(false);
    const [acceptMarketing, setAcceptMarketing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [activated, setActivated] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        const policy = validatePassword(password);
        if (!policy.ok) {
            setError(`Password non valida: ${policy.errors.join(", ")}.`);
            setLoading(false);
            return;
        }
        if (password !== confirm) {
            setError("Le password non coincidono.");
            setLoading(false);
            return;
        }
        if (!acceptTerms) {
            setError("Devi accettare i Termini di Servizio e la Privacy Policy.");
            setLoading(false);
            return;
        }
        if (!acceptHealth) {
            setError(
                "Per usare l'app è necessario il consenso al trattamento dei dati di salute (art. 9 GDPR)."
            );
            setLoading(false);
            return;
        }

        try {
            const result = await completeOnboarding(token, password, {
                terms: acceptTerms,
                health: acceptHealth,
                marketing: acceptMarketing,
            });
            if (result.success) {
                setActivated(true);
            } else {
                setError(result.error || "Errore");
            }
        } catch {
            setError("Errore di connessione. Riprova.");
        } finally {
            setLoading(false);
        }
    }

    if (activated) {
        return (
            <div className="text-center space-y-6">
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                    style={{ background: `${primaryColor}15` }}>
                    <CheckCircle2 size={32} style={{ color: primaryColor }} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">
                        Account attivato! 🎉
                    </h2>
                    <p className="text-slate-500 text-sm">
                        Ora scarica l&apos;app e accedi con la tua email
                        <br />
                        <strong className="text-slate-700">{email}</strong> e la
                        password appena impostata.
                    </p>
                </div>
                <div
                    className="rounded-xl p-3 flex items-center gap-3 text-left"
                    style={{ background: `${primaryColor}10` }}
                >
                    <Smartphone size={20} style={{ color: primaryColor }} />
                    <p className="text-xs text-slate-700">
                        Il portale web è stato sostituito dall&apos;app mobile —
                        molto più veloce e con tutte le funzioni che ti servono.
                    </p>
                </div>
                <div className="space-y-2">
                    <a
                        href="#"
                        className="flex items-center justify-center gap-3 w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors text-white font-semibold text-sm"
                    >
                        <Download size={16} />
                        Scarica per iPhone
                    </a>
                    <a
                        href="#"
                        className="flex items-center justify-center gap-3 w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors text-white font-semibold text-sm"
                    >
                        <Download size={16} />
                        Scarica per Android
                    </a>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Email</Label>
                <Input value={email} readOnly disabled className="h-12 rounded-xl border-slate-200 bg-slate-50" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
                <div className="relative">
                    <Input id="password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 rounded-xl border-slate-200 pr-12" style={{ "--tw-ring-color": primaryColor } as React.CSSProperties} autoComplete="new-password" />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                <PasswordStrength password={password} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirm" className="text-sm font-semibold text-slate-700">Conferma Password</Label>
                <Input id="confirm" type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="h-12 rounded-xl border-slate-200" autoComplete="new-password" />
            </div>

            <div className="space-y-3 pt-1">
                <label className="flex items-start gap-3 text-sm text-slate-600 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-1"
                    />
                    <span>
                        Ho letto e accetto i{" "}
                        <a
                            href="/legal/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium"
                            style={{ color: primaryColor }}
                        >
                            Termini di Servizio
                        </a>{" "}
                        e la{" "}
                        <a
                            href="/legal/privacy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium"
                            style={{ color: primaryColor }}
                        >
                            Privacy Policy
                        </a>
                        . <span className="text-rose-500">*</span>
                    </span>
                </label>

                <label className="flex items-start gap-3 text-sm text-slate-600 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={acceptHealth}
                        onChange={(e) => setAcceptHealth(e.target.checked)}
                        className="mt-1"
                    />
                    <span>
                        Acconsento al trattamento dei miei{" "}
                        <strong>dati relativi alla salute</strong> (peso,
                        misurazioni, foto di progresso, anamnesi, allergie,
                        patologie) per le finalità di personal training
                        descritte nell&apos;informativa, ai sensi dell&apos;art.
                        9 GDPR. <span className="text-rose-500">*</span>
                    </span>
                </label>

                <label className="flex items-start gap-3 text-sm text-slate-600 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={acceptMarketing}
                        onChange={(e) =>
                            setAcceptMarketing(e.target.checked)
                        }
                        className="mt-1"
                    />
                    <span>
                        Acconsento (facoltativo) a ricevere comunicazioni
                        commerciali, annunci di nuovi pacchetti e offerte
                        promozionali.
                    </span>
                </label>
            </div>

            {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl px-4 py-3">{error}</div>}

            <button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 shadow-lg" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}>
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Attiva Account <ArrowRight size={18} /></>}
            </button>
        </form>
    );
}

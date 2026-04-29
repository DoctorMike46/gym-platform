"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
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
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState(false);
    const [accept, setAccept] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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
        if (!accept) {
            setError("Devi accettare i termini.");
            setLoading(false);
            return;
        }

        try {
            const result = await completeOnboarding(token, password, accept);
            if (result.success) {
                router.push("/portal");
                router.refresh();
            } else {
                setError(result.error || "Errore");
            }
        } catch {
            setError("Errore di connessione. Riprova.");
        } finally {
            setLoading(false);
        }
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

            <label className="flex items-start gap-3 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-1" />
                <span>Accetto i termini di servizio e la privacy policy</span>
            </label>

            {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl px-4 py-3">{error}</div>}

            <button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 shadow-lg" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}>
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Attiva Account <ArrowRight size={18} /></>}
            </button>
        </form>
    );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Save, CheckCircle2 } from "lucide-react";
import { resetClientPassword } from "@/lib/actions/portal-auth";
import { validatePassword } from "@/lib/password-policy";
import PasswordStrength from "@/components/ui/password-strength";

export default function ResetForm({ token, primaryColor }: { token: string; primaryColor: string }) {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const policy = validatePassword(password);
        if (!policy.ok) {
            setError(`Password non valida: ${policy.errors.join(", ")}.`);
            setIsLoading(false);
            return;
        }
        if (password !== confirmPassword) {
            setError("Le password non coincidono.");
            setIsLoading(false);
            return;
        }

        try {
            const result = await resetClientPassword(token, password);
            if (result.success) {
                setSuccess(true);
                setTimeout(() => router.push("/portal/login"), 3000);
            } else {
                setError(result.error || "Errore");
            }
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
                <h3 className="text-xl font-bold text-slate-900 mb-2">Password Aggiornata!</h3>
                <p className="text-slate-500 text-sm">Stai per essere reindirizzato al login...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Nuova Password</Label>
                <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 rounded-xl border-slate-200 pr-12" style={{ "--tw-ring-color": primaryColor } as React.CSSProperties} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                <PasswordStrength password={password} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">Conferma Password</Label>
                <Input id="confirmPassword" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="h-12 rounded-xl border-slate-200" style={{ "--tw-ring-color": primaryColor } as React.CSSProperties} autoComplete="new-password" />
            </div>

            {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl px-4 py-3">{error}</div>}

            <button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 shadow-lg" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}>
                {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={18} /> Salva Password</>}
            </button>
        </form>
    );
}

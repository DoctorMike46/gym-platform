"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Save, CheckCircle2 } from "lucide-react";
import { resetPassword } from "@/lib/actions/auth-reset";
import { toast } from "sonner";

export default function ResetPasswordForm({
    token,
    primaryColor
}: {
    token: string;
    primaryColor: string;
}) {
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

        if (password.length < 8) {
            setError("La password deve essere di almeno 8 caratteri.");
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError("Le password non coincidono.");
            setIsLoading(false);
            return;
        }

        try {
            const result = await resetPassword(token, password);
            if (result.success) {
                setSuccess(true);
                toast.success("Password aggiornata con successo!");
                setTimeout(() => {
                    router.push("/login");
                }, 3000);
            } else {
                setError(result.error || "Errore durante il reset.");
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
                <h3 className="text-xl font-bold text-slate-900 mb-2">Password Aggiornata!</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                    La tua password è stata resettata correttamente. Stai per essere reindirizzato al login...
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                    Nuova Password
                </Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-12 rounded-xl border-slate-200 pr-12 focus-visible:ring-2 focus-visible:ring-offset-0"
                        style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">
                    Conferma Password
                </Label>
                <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-offset-0"
                    style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
                    autoComplete="new-password"
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
                className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <>
                        <Save size={18} />
                        Salva Nuova Password
                    </>
                )}
            </button>
        </form>
    );
}

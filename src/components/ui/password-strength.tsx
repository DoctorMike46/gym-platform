"use client";

import { validatePassword } from "@/lib/password-policy";
import { Check, X } from "lucide-react";

export default function PasswordStrength({ password }: { password: string }) {
    if (!password) return null;

    const { score, errors } = validatePassword(password);

    const labels = ["Debole", "Sufficiente", "Buona", "Forte"];
    const colors = ["bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"];
    const textColors = ["text-rose-600", "text-amber-600", "text-emerald-600", "text-emerald-700"];

    const criteria = [
        { label: "Almeno 10 caratteri", ok: password.length >= 10 },
        { label: "Almeno una lettera", ok: /[A-Za-z]/.test(password) },
        { label: "Almeno una cifra", ok: /[0-9]/.test(password) },
    ];

    return (
        <div className="space-y-2">
            <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i < score ? colors[score - 1] : "bg-slate-200"
                        }`}
                    />
                ))}
            </div>
            {score > 0 && (
                <p className={`text-xs font-medium ${textColors[score - 1]}`}>
                    Sicurezza: {labels[score - 1]}
                </p>
            )}
            {errors.length > 0 && (
                <ul className="space-y-1 mt-2">
                    {criteria.map((c) => (
                        <li
                            key={c.label}
                            className={`flex items-center gap-2 text-xs ${
                                c.ok ? "text-emerald-600" : "text-slate-500"
                            }`}
                        >
                            {c.ok ? <Check size={12} /> : <X size={12} />}
                            {c.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Lock, Save } from "lucide-react";
import { updateMyProfile, changeMyPassword } from "@/lib/actions/portal-profile";
import { validatePassword } from "@/lib/password-policy";
import PasswordStrength from "@/components/ui/password-strength";
import { toast } from "sonner";

export default function ProfileContent({
    profile,
    subscription,
}: {
    profile: {
        id: number;
        nome: string;
        cognome: string;
        email: string;
        telefono: string | null;
        peso: string | null;
        altezza: string | null;
        eta: number | null;
        data_di_nascita: string | null;
        anamnesi_status: string;
    };
    subscription: { sub: { data_fine: string | null }; service: { nome_servizio: string } | null } | null;
}) {
    const [telefono, setTelefono] = useState(profile.telefono || "");
    const [savingProfile, setSavingProfile] = useState(false);

    const [oldPwd, setOldPwd] = useState("");
    const [newPwd, setNewPwd] = useState("");
    const [confirmPwd, setConfirmPwd] = useState("");
    const [savingPwd, setSavingPwd] = useState(false);

    async function saveProfile(e: React.FormEvent) {
        e.preventDefault();
        setSavingProfile(true);
        const result = await updateMyProfile({ telefono });
        if (result.success) toast.success("Profilo aggiornato");
        else toast.error("Errore");
        setSavingProfile(false);
    }

    async function savePassword(e: React.FormEvent) {
        e.preventDefault();
        setSavingPwd(true);
        const policy = validatePassword(newPwd);
        if (!policy.ok) {
            toast.error(`Password non valida: ${policy.errors.join(", ")}`);
            setSavingPwd(false);
            return;
        }
        if (newPwd !== confirmPwd) {
            toast.error("Le password non coincidono");
            setSavingPwd(false);
            return;
        }
        const result = await changeMyPassword(oldPwd, newPwd);
        if (result.success) {
            toast.success("Password aggiornata");
            setOldPwd("");
            setNewPwd("");
            setConfirmPwd("");
        } else {
            toast.error(result.error || "Errore");
        }
        setSavingPwd(false);
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">Profilo</h1>
                <p className="text-slate-500 text-sm mt-1">Dati personali e impostazioni</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><User size={18} /> Anagrafica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between border-b border-slate-100 py-2">
                        <span className="text-sm text-slate-500">Nome</span>
                        <span className="text-sm font-medium text-slate-900">{profile.nome} {profile.cognome}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 py-2">
                        <span className="text-sm text-slate-500 flex items-center gap-1.5"><Mail size={14} /> Email</span>
                        <span className="text-sm font-medium text-slate-900">{profile.email}</span>
                    </div>
                    {profile.eta && (
                        <div className="flex justify-between border-b border-slate-100 py-2">
                            <span className="text-sm text-slate-500">Età</span>
                            <span className="text-sm font-medium text-slate-900">{profile.eta} anni</span>
                        </div>
                    )}
                    {profile.peso && (
                        <div className="flex justify-between border-b border-slate-100 py-2">
                            <span className="text-sm text-slate-500">Peso (iniziale)</span>
                            <span className="text-sm font-medium text-slate-900">{profile.peso} kg</span>
                        </div>
                    )}
                    {profile.altezza && (
                        <div className="flex justify-between border-b border-slate-100 py-2">
                            <span className="text-sm text-slate-500">Altezza</span>
                            <span className="text-sm font-medium text-slate-900">{profile.altezza} cm</span>
                        </div>
                    )}
                    <div className="flex justify-between py-2">
                        <span className="text-sm text-slate-500">Anamnesi</span>
                        <Badge variant={profile.anamnesi_status === "firmato" ? "default" : "outline"}>
                            {profile.anamnesi_status}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {subscription && (
                <Card className="border-emerald-200 bg-emerald-50/40">
                    <CardHeader>
                        <CardTitle className="text-base">Abbonamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-bold text-slate-900">{subscription.service?.nome_servizio}</p>
                        {subscription.sub.data_fine && (
                            <p className="text-xs text-slate-500 mt-1">
                                Scadenza: {new Date(subscription.sub.data_fine).toLocaleDateString("it-IT")}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><Phone size={18} /> Contatti</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={saveProfile} className="space-y-3">
                        <div>
                            <Label htmlFor="telefono">Telefono</Label>
                            <Input id="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+39 ..." />
                        </div>
                        <Button type="submit" disabled={savingProfile} className="gap-2">
                            <Save size={14} /> {savingProfile ? "Salvataggio…" : "Salva"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><Lock size={18} /> Password</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={savePassword} className="space-y-3">
                        <div>
                            <Label htmlFor="old">Password attuale</Label>
                            <Input id="old" type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} required autoComplete="current-password" />
                        </div>
                        <div>
                            <Label htmlFor="new">Nuova password</Label>
                            <Input id="new" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required autoComplete="new-password" />
                            <PasswordStrength password={newPwd} />
                        </div>
                        <div>
                            <Label htmlFor="confirm">Conferma nuova password</Label>
                            <Input id="confirm" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required autoComplete="new-password" />
                        </div>
                        <Button type="submit" disabled={savingPwd} className="gap-2">
                            <Lock size={14} /> {savingPwd ? "Aggiornamento…" : "Aggiorna password"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

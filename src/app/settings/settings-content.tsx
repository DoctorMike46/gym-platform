"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Palette, Globe, Save, Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { updateSettings } from "@/lib/actions/settings";
import { cn } from "@/lib/utils";

export default function SettingsContent({ settingsData }: { settingsData: any }) {
    const [primaryColor, setPrimaryColor] = useState(settingsData?.primary_color || "#003366");
    const [sidebarColor, setSidebarColor] = useState(settingsData?.sidebar_color || "#003366");
    const [isSaving, setIsSaving] = useState(false);

    const [logoUrl, setLogoUrl] = useState<string>(settingsData?.logo_url || "");
    const [sidebarLogoUrl, setSidebarLogoUrl] = useState<string>(settingsData?.sidebar_logo_url || "");
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingSidebarLogo, setIsUploadingSidebarLogo] = useState(false);

    const logoInputRef = useRef<HTMLInputElement>(null);
    const sidebarLogoInputRef = useRef<HTMLInputElement>(null);

    async function uploadFile(file: File, type: "logo" | "sidebar_logo") {
        const isLogo = type === "logo";
        if (isLogo) setIsUploadingLogo(true);
        else setIsUploadingSidebarLogo(true);

        try {
            const fd = new FormData();
            fd.append("file", file);

            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const data = await res.json();

            if (!res.ok || data.error) {
                toast.error(data.error || "Errore durante l'upload");
                return;
            }

            if (isLogo) {
                setLogoUrl(data.url);
                toast.success("Logo caricato con successo!");
            } else {
                setSidebarLogoUrl(data.url);
                toast.success("Icona caricata con successo!");
            }
        } catch {
            toast.error("Errore di connessione durante l'upload.");
        } finally {
            if (isLogo) setIsUploadingLogo(false);
            else setIsUploadingSidebarLogo(false);
        }
    }

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadFile(file, "logo");
    };

    const handleSidebarLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadFile(file, "sidebar_logo");
    };

    const handleDrop = (e: React.DragEvent, type: "logo" | "sidebar_logo") => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) uploadFile(file, type);
    };

    async function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSaving(true);
        const formData = new FormData(e.currentTarget);
        try {
            await updateSettings(formData);
            toast.success("Impostazioni salvate con successo!");
        } catch {
            toast.error("Errore durante il salvataggio.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form onSubmit={handleSave} className="space-y-8 max-w-4xl pb-10">
            {/* Hidden logo URL fields for form submission */}
            <input type="hidden" name="logo_url" value={logoUrl} />
            <input type="hidden" name="sidebar_logo_url" value={sidebarLogoUrl} />

            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Impostazioni Brand</h1>
                    <p className="text-slate-500 mt-1">Personalizza l'estetica della tua piattaforma.</p>
                </div>
                <Button type="submit" disabled={isSaving} className="bg-[#003366] hover:bg-blue-900 text-white gap-2 shadow-lg px-6 h-11">
                    {isSaving ? "Salvataggio..." : <><Save size={18} /> Salva Cambiamenti</>}
                </Button>
            </div>

            <div className="grid gap-6">
                {/* Identità */}
                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <Globe size={18} className="text-[#003366]" />
                            <CardTitle className="text-lg">Identità del Sito</CardTitle>
                        </div>
                        <CardDescription>Nome della piattaforma e configurazione colori.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="site_name" className="text-sm font-semibold text-slate-700">Nome Piattaforma / Brand</Label>
                            <Input id="site_name" name="site_name" defaultValue={settingsData?.site_name || "Ernesto Performance"} className="max-w-md" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Primary Color */}
                            <div className="space-y-4">
                                <Label className="text-sm font-semibold text-slate-700">Colore Primario (Pulsanti & Accenti)</Label>
                                <div className="flex items-center gap-4">
                                    <div className="relative group">
                                        <div
                                            className="w-14 h-14 rounded-2xl border-2 border-slate-200 shadow-sm cursor-pointer transition-transform group-hover:scale-105 flex items-center justify-center overflow-hidden"
                                            style={{ backgroundColor: primaryColor }}
                                            onClick={() => document.getElementById('primary_picker')?.click()}
                                        >
                                            <Palette size={20} className="mix-blend-difference invert text-white" />
                                        </div>
                                        <input type="color" id="primary_picker" className="absolute invisible" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Input name="primary_color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono text-sm h-10" />
                                        <p className="text-[10px] text-slate-400">Pulsanti e link principali.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Color */}
                            <div className="space-y-4">
                                <Label className="text-sm font-semibold text-slate-700">Colore Sidebar (Isola)</Label>
                                <div className="flex items-center gap-4">
                                    <div className="relative group">
                                        <div
                                            className="w-14 h-14 rounded-2xl border-2 border-slate-200 shadow-sm cursor-pointer transition-transform group-hover:scale-105 flex items-center justify-center overflow-hidden"
                                            style={{ backgroundColor: sidebarColor }}
                                            onClick={() => document.getElementById('sidebar_picker')?.click()}
                                        >
                                            <Palette size={20} className="mix-blend-difference invert text-white" />
                                        </div>
                                        <input type="color" id="sidebar_picker" className="absolute invisible" value={sidebarColor} onChange={(e) => setSidebarColor(e.target.value)} />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Input name="sidebar_color" value={sidebarColor} onChange={(e) => setSidebarColor(e.target.value)} className="font-mono text-sm h-10" />
                                        <p className="text-[10px] text-slate-400">Sfondo dell'isola sidebar.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Logo Upload */}
                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <Palette size={18} className="text-[#003366]" />
                            <CardTitle className="text-lg">Logo & Assets</CardTitle>
                        </div>
                        <CardDescription>Le immagini vengono caricate immediatamente. Salva per confermare.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Logo Esteso */}
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold text-slate-700">Logo Sidebar (Versione Estesa)</Label>
                                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoChange} />
                                {logoUrl ? (
                                    <div className="relative group border border-slate-200 rounded-3xl p-4 bg-slate-50 min-h-[120px] flex items-center justify-center">
                                        <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
                                        <div className="absolute inset-0 rounded-3xl bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
                                            <Button type="button" size="sm" variant="secondary" onClick={() => logoInputRef.current?.click()} className="h-8 text-xs gap-1">
                                                <Upload size={12} /> Cambia
                                            </Button>
                                            <Button type="button" size="sm" variant="destructive" onClick={() => setLogoUrl("")} className="h-8 text-xs gap-1">
                                                <X size={12} /> Rimuovi
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <UploadArea
                                        onClick={() => logoInputRef.current?.click()}
                                        onDrop={(e) => handleDrop(e, "logo")}
                                        isUploading={isUploadingLogo}
                                        hint="PNG, JPG, SVG fino a 2MB"
                                    />
                                )}
                            </div>

                            {/* Icona Ridotta */}
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold text-slate-700">Icona Sidebar (Versione Ridotta)</Label>
                                <input type="file" ref={sidebarLogoInputRef} className="hidden" accept="image/*" onChange={handleSidebarLogoChange} />
                                {sidebarLogoUrl ? (
                                    <div className="relative group border border-slate-200 rounded-3xl p-4 bg-slate-50 min-h-[120px] flex items-center justify-center">
                                        <img src={sidebarLogoUrl} alt="Icona" className="h-16 w-16 object-contain" />
                                        <div className="absolute inset-0 rounded-3xl bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
                                            <Button type="button" size="sm" variant="secondary" onClick={() => sidebarLogoInputRef.current?.click()} className="h-8 text-xs gap-1">
                                                <Upload size={12} /> Cambia
                                            </Button>
                                            <Button type="button" size="sm" variant="destructive" onClick={() => setSidebarLogoUrl("")} className="h-8 text-xs gap-1">
                                                <X size={12} /> Rimuovi
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <UploadArea
                                        onClick={() => sidebarLogoInputRef.current?.click()}
                                        onDrop={(e) => handleDrop(e, "sidebar_logo")}
                                        isUploading={isUploadingSidebarLogo}
                                        hint="SVG consigliato (max 512×512px)"
                                        icon="image"
                                    />
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </form>
    );
}

function UploadArea({ onClick, onDrop, isUploading, hint, icon = "upload" }: {
    onClick: () => void;
    onDrop: (e: React.DragEvent) => void;
    isUploading: boolean;
    hint: string;
    icon?: "upload" | "image";
}) {
    return (
        <div
            onClick={onClick}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="group border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center bg-slate-50/50 hover:bg-white hover:border-[#003366] transition-all cursor-pointer flex flex-col items-center gap-3"
        >
            <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center text-slate-400 group-hover:text-[#003366] transition-colors">
                {isUploading ? (
                    <div className="w-5 h-5 border-2 border-[#003366] border-t-transparent rounded-full animate-spin" />
                ) : icon === "image" ? (
                    <ImageIcon size={20} />
                ) : (
                    <Upload size={20} />
                )}
            </div>
            <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700">{isUploading ? "Caricamento..." : "Trascina o clicca"}</p>
                <p className="text-xs text-slate-400">{hint}</p>
            </div>
        </div>
    );
}

"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Palette, Globe, Save, Upload, X, Image as ImageIcon, FileText } from "lucide-react";
import { toast } from "sonner";
import { updateSettings } from "@/lib/actions/settings";

export default function SettingsContent({ settingsData }: { settingsData: any }) {
    const [primaryColor, setPrimaryColor] = useState(settingsData?.primary_color || "#003366");
    const [sidebarColor, setSidebarColor] = useState(settingsData?.sidebar_color || "#003366");
    const [secondaryColor, setSecondaryColor] = useState(settingsData?.secondary_color || "#1e40af");
    const [isSaving, setIsSaving] = useState(false);

    const [logoUrl, setLogoUrl] = useState<string>(settingsData?.logo_url || "");
    const [sidebarLogoUrl, setSidebarLogoUrl] = useState<string>(settingsData?.sidebar_logo_url || "");
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingSidebarLogo, setIsUploadingSidebarLogo] = useState(false);

    const logoInputRef = useRef<HTMLInputElement>(null);
    const sidebarLogoInputRef = useRef<HTMLInputElement>(null);

    // PDF Text States
    const [pdfIntroTitle, setPdfIntroTitle] = useState(settingsData?.pdf_services_intro_title || "");
    const [pdfIntroText, setPdfIntroText] = useState(settingsData?.pdf_services_intro_text || "");
    const [pdfRules, setPdfRules] = useState(settingsData?.pdf_services_rules || "");
    const [pdfStart, setPdfStart] = useState(settingsData?.pdf_services_start || "");
    const [pdfWorkoutsFooter, setPdfWorkoutsFooter] = useState(settingsData?.pdf_workouts_footer || "");

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
            toast.success("Impostazioni salvate! Ricarica la pagina per vedere i colori aggiornati.");
        } catch {
            toast.error("Errore durante il salvataggio.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form onSubmit={handleSave} className="space-y-8 max-w-4xl pb-10">
            {/* Hidden fields */}
            <input type="hidden" name="logo_url" value={logoUrl} />
            <input type="hidden" name="sidebar_logo_url" value={sidebarLogoUrl} />

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Impostazioni Brand</h1>
                    <p className="text-slate-500 mt-1">Personalizza l'estetica della tua piattaforma.</p>
                </div>
                <Button type="submit" disabled={isSaving} className="brand-bg text-white gap-2 shadow-lg px-6 h-11 w-full sm:w-auto">
                    {isSaving ? "Salvataggio..." : <><Save size={18} /> Salva Cambiamenti</>}
                </Button>
            </div>

            <div className="grid gap-6">
                {/* Identità */}
                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <Globe size={18} className="brand-text" />
                            <CardTitle className="text-lg">Identità del Sito</CardTitle>
                        </div>
                        <CardDescription>Nome della piattaforma e configurazione colori.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="site_name" className="text-sm font-semibold text-slate-700">Nome Piattaforma / Brand</Label>
                            <Input id="site_name" name="site_name" defaultValue={settingsData?.site_name || "Ernesto Performance"} className="max-w-md" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                            {/* Primary Color */}
                            <ColorPicker
                                label="Colore Primario (Pulsanti & Accenti)"
                                name="primary_color"
                                pickerId="primary_picker"
                                value={primaryColor}
                                onChange={setPrimaryColor}
                                hint="Sfondo pulsanti principali e testi in evidenza."
                            />

                            {/* Sidebar Color */}
                            <ColorPicker
                                label="Colore Sidebar"
                                name="sidebar_color"
                                pickerId="sidebar_picker"
                                value={sidebarColor}
                                onChange={setSidebarColor}
                                hint="Gradiente del pannello laterale."
                            />

                            {/* Secondary Color */}
                            <ColorPicker
                                label="Colore Secondario"
                                name="secondary_color"
                                pickerId="secondary_picker"
                                value={secondaryColor}
                                onChange={setSecondaryColor}
                                hint="Accenti secondari e badge."
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Logo Upload */}
                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <Palette size={18} className="brand-text" />
                            <CardTitle className="text-lg">Logo & Assets</CardTitle>
                        </div>
                        <CardDescription>Le immagini vengono caricate immediatamente. Salva per confermare.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
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

                {/* Testi PDF */}
                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <FileText size={18} className="brand-text" />
                            <CardTitle className="text-lg">Testi PDF Personalizzabili</CardTitle>
                        </div>
                        <CardDescription>Modifica i testi stampati nei PDF del Listino Servizi e delle Schede di Allenamento.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-6">
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-slate-700">Titolo Intestazione Listino Servizi</Label>
                            <Input
                                name="pdf_services_intro_title"
                                value={pdfIntroTitle}
                                onChange={(e) => setPdfIntroTitle(e.target.value)}
                                placeholder="Personal Training • Postura • Performance • Bodybuilding"
                            />
                            <p className="text-[11px] text-slate-400">Sottotitolo visualizzato subito sopra il titolo del Listino nel PDF.</p>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-slate-700">Descrizione Introduttiva Listino</Label>
                            <Textarea
                                name="pdf_services_intro_text"
                                value={pdfIntroText}
                                onChange={(e) => setPdfIntroText(e.target.value)}
                                placeholder="Questo documento ti spiega in modo semplice cosa include ogni servizio, quanto costa e come funziona..."
                                rows={3}
                            />
                            <p className="text-[11px] text-slate-400">Paragrafo introduttivo che appare subito dopo il titolo del Listino Servizi.</p>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-slate-700">Sezione &quot;Regole Chiare&quot;</Label>
                            <Textarea
                                name="pdf_services_rules"
                                value={pdfRules}
                                onChange={(e) => setPdfRules(e.target.value)}
                                placeholder={"• Tempi risposta chat: entro 24–48h (lun–ven).\n• Check-in: Coaching Standard settimanale.\n• Modifiche: Coaching Standard 1–2/mese."}
                                rows={5}
                            />
                            <p className="text-[11px] text-slate-400">Ogni riga diventa un bullet point nel PDF. Lascia vuoto per omettere la sezione.</p>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-slate-700">Sezione &quot;Come si Parte&quot;</Label>
                            <Textarea
                                name="pdf_services_start"
                                value={pdfStart}
                                onChange={(e) => setPdfStart(e.target.value)}
                                placeholder={"1. Mi mandi: obiettivo, dove ti alleni, quante volte a settimana, eventuali infortuni.\n2. Scegliamo il pacchetto più adatto.\n3. Avvio: ti invio scheda e istruzioni (PDF)."}
                                rows={4}
                            />
                            <p className="text-[11px] text-slate-400">Ogni riga diventa un punto nel PDF. Lascia vuoto per omettere la sezione.</p>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-slate-700">Footer Schede Allenamento</Label>
                            <Textarea
                                name="pdf_workouts_footer"
                                value={pdfWorkoutsFooter}
                                onChange={(e) => setPdfWorkoutsFooter(e.target.value)}
                                placeholder="Scheda per finalità di fitness/performance/benessere generale. Non sostituisce parere medico..."
                                rows={3}
                            />
                            <p className="text-[11px] text-slate-400">Nota legale/disclaimer a piè di pagina delle Schede Allenamento.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </form>
    );
}

function ColorPicker({ label, name, pickerId, value, onChange, hint }: {
    label: string;
    name: string;
    pickerId: string;
    value: string;
    onChange: (v: string) => void;
    hint: string;
}) {
    return (
        <div className="space-y-4">
            <Label className="text-sm font-semibold text-slate-700">{label}</Label>
            <div className="flex items-center gap-4">
                <div className="relative group">
                    <div
                        className="w-14 h-14 rounded-2xl border-2 border-slate-200 shadow-sm cursor-pointer transition-transform group-hover:scale-105 flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: value }}
                        onClick={() => document.getElementById(pickerId)?.click()}
                    >
                        <Palette size={20} className="mix-blend-difference invert text-white" />
                    </div>
                    <input type="color" id={pickerId} className="absolute invisible" value={value} onChange={(e) => onChange(e.target.value)} />
                </div>
                <div className="flex-1 space-y-1">
                    <Input name={name} value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-sm h-10" />
                    <p className="text-[10px] text-slate-400">{hint}</p>
                </div>
            </div>
        </div>
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
            className="group border-2 border-dashed border-slate-200 rounded-3xl p-6 sm:p-8 text-center bg-slate-50/50 hover:bg-white brand-hover-border transition-all cursor-pointer flex flex-col items-center gap-3"
        >
            <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center text-slate-400 brand-hover-text transition-colors">
                {isUploading ? (
                    <div className="w-5 h-5 border-2 brand-spin-border rounded-full animate-spin" />
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

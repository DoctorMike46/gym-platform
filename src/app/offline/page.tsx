import { WifiOff } from "lucide-react";

export const metadata = {
    title: "Offline | Ernesto Performance",
};

export default function OfflinePage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center border border-slate-100">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                    <WifiOff size={32} className="text-slate-500" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2">Sei offline</h1>
                <p className="text-slate-500 text-sm leading-relaxed">
                    Non c&apos;è connessione di rete. Le pagine già visitate sono ancora consultabili.
                </p>
            </div>
        </div>
    );
}

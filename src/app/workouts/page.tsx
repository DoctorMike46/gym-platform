import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Dumbbell, FileText, MoreVertical } from "lucide-react";
import { getWorkoutTemplates } from "@/lib/actions/workouts";
import Link from "next/link";

export default async function WorkoutsPage() {
    const templates = await getWorkoutTemplates();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Programmi di Allenamento</h1>
                    <p className="text-slate-500 mt-1">Gestisci i tuoi template e assegnali ai tuoi atleti.</p>
                </div>
                <Link href="/workouts/builder">
                    <Button className="bg-[#003366] hover:bg-blue-900 text-white gap-2">
                        <Plus size={16} /> Crea Nuovo Programma
                    </Button>
                </Link>
            </div>

            <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-slate-50 border-slate-200">
                            <TableHead className="text-slate-700 font-semibold w-[400px]">Nome Programma</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Split</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Data Creazione</TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold">Azioni</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {templates.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <Dumbbell className="h-8 w-8 opacity-20" />
                                        <p>Nessun programma salvato. Inizia creandone uno nuovo.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}

                        {templates.map((template) => (
                            <TableRow key={template.id} className="border-slate-200 hover:bg-slate-50 text-slate-800 group">
                                <TableCell className="font-semibold text-[#003366]">
                                    <div className="flex items-center gap-2">
                                        <FileText size={16} className="text-slate-400" />
                                        {template.nome_template}
                                    </div>
                                </TableCell>
                                <TableCell>{template.split_settimanale} Sessioni</TableCell>
                                <TableCell className="text-slate-500">
                                    {new Date(template.created_at).toLocaleDateString('it-IT')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="text-slate-400 group-hover:text-slate-900">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

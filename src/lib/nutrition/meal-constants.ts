import {
    Apple,
    Coffee,
    Cookie,
    Moon,
    Soup,
    UtensilsCrossed,
    type LucideIcon,
} from "lucide-react";
import type { MealItem } from "./types";

export interface MomentoMeta {
    value: string;
    label: string;
    icon: LucideIcon;
    orario: string;
}

export const MOMENTI: readonly MomentoMeta[] = [
    { value: "colazione", label: "Colazione", icon: Coffee, orario: "07:30" },
    { value: "spuntino_mat", label: "Spuntino mattina", icon: Apple, orario: "10:30" },
    { value: "pranzo", label: "Pranzo", icon: UtensilsCrossed, orario: "13:00" },
    { value: "spuntino_pom", label: "Spuntino pomeriggio", icon: Cookie, orario: "16:30" },
    { value: "cena", label: "Cena", icon: Soup, orario: "19:30" },
    { value: "pre_nanna", label: "Pre-nanna", icon: Moon, orario: "22:00" },
] as const;

export const GIORNI = [
    { idx: 1, short: "Lun", long: "Lunedì" },
    { idx: 2, short: "Mar", long: "Martedì" },
    { idx: 3, short: "Mer", long: "Mercoledì" },
    { idx: 4, short: "Gio", long: "Giovedì" },
    { idx: 5, short: "Ven", long: "Venerdì" },
    { idx: 6, short: "Sab", long: "Sabato" },
    { idx: 7, short: "Dom", long: "Domenica" },
];

export interface MealCell {
    descrizione: string;
    kcal: string;
    proteine: string;
    carbo: string;
    grassi: string;
    note: string;
    items?: MealItem[];
}

export function emptyCell(): MealCell {
    return {
        descrizione: "",
        kcal: "",
        proteine: "",
        carbo: "",
        grassi: "",
        note: "",
    };
}

export function cellKey(day: number, momento: string): string {
    return `${day}-${momento}`;
}

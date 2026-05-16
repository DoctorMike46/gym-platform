export const GRUPPI_MUSCOLARI = [
    "Petto",
    "Dorso",
    "Spalle",
    "Gambe",
    "Bicipiti",
    "Tricipiti",
    "Addome",
    "Cardio",
    "Corpo libero",
    "Superserie",
] as const;

export type GruppoMuscolare = (typeof GRUPPI_MUSCOLARI)[number];

export const LEGACY_GRUPPI_TO_MIGRATE: Record<string, GruppoMuscolare> = {
    "Full Body": "Corpo libero",
    Altro: "Corpo libero",
};

import "dotenv/config";
import { Client } from "pg";

/**
 * Seed del template "SALUTE & NUTRIZIONE" per ogni trainer.
 * Riferimento: screenshot Warfit — sezione iniziale alimentazione + anamnesi alimentare.
 * Idempotente: skippa i trainer che lo hanno già.
 */

const SALUTE_NUTRIZIONE_SCHEMA = {
    sections: [
        {
            id: "salute",
            title: "Salute",
            question_ids: ["patologie", "farmaci", "allergie", "infortuni_attuali"],
        },
        {
            id: "supporto",
            title: "Supporto attuale & macros",
            question_ids: ["seguito_da_nutrizionista", "kcal_macro_attuali"],
        },
        {
            id: "pasti",
            title: "Cosa mangi durante la settimana",
            question_ids: [
                "colazione",
                "spuntino_mat",
                "pranzo",
                "spuntino_pom",
                "cena",
                "fuori_pasto",
                "weekend",
            ],
        },
        {
            id: "bevande",
            title: "Bevande & abitudini",
            question_ids: ["acqua_lontano_pasti", "caffe_giorno", "alcol", "vegetariano"],
        },
        {
            id: "preferenze",
            title: "Preferenze & obiettivi",
            question_ids: [
                "alimenti_amati",
                "alimenti_evitati",
                "obiettivo_dietetico",
                "stile_vita_giornaliero",
            ],
        },
    ],
    questions: [
        // ─── Salute ────────────────────────────────────────────────
        {
            id: "patologie",
            type: "textarea",
            label: "Hai una patologia certificata da un medico? Se sì, quale?",
            required: true,
        },
        {
            id: "farmaci",
            type: "textarea",
            label: "Assumi farmaci? Se sì, quali?",
            required: true,
        },
        {
            id: "allergie",
            type: "textarea",
            label: "Hai allergie o intolleranze? Se sì, elenca gli effetti negativi e la gravità",
            hint: "Es. lattosio: gonfiore lieve, frumento: dermatite, ecc.",
            required: true,
        },
        {
            id: "infortuni_attuali",
            type: "textarea",
            label: "Infortuni o problemi fisici attuali che impattano l'alimentazione",
            required: false,
        },

        // ─── Supporto attuale ─────────────────────────────────────
        {
            id: "seguito_da_nutrizionista",
            type: "radio",
            label: "Attualmente sei seguito/a da una persona sotto l'aspetto alimentare?",
            required: true,
            options: [
                "Sì, da un nutrizionista/dietologo",
                "Sì, da un altro coach",
                "No",
            ],
        },
        {
            id: "kcal_macro_attuali",
            type: "textarea",
            label: "Se in tuo possesso, scrivimi le tue kcal e i tuoi macro attuali e da quanto tempo li stai rispettando",
            required: false,
        },

        // ─── Pasti ────────────────────────────────────────────────
        {
            id: "colazione",
            type: "textarea",
            label: "Cosa mangi a colazione? (alimenti e quantitativi in gr)",
            required: true,
        },
        {
            id: "spuntino_mat",
            type: "textarea",
            label: "Spuntino mattina (alimenti e quantitativi in gr)",
            required: false,
        },
        {
            id: "pranzo",
            type: "textarea",
            label: "Pranzo (alimenti e quantitativi in gr)",
            required: true,
        },
        {
            id: "spuntino_pom",
            type: "textarea",
            label: "Spuntino pomeriggio (alimenti e quantitativi in gr)",
            required: false,
        },
        {
            id: "cena",
            type: "textarea",
            label: "Cena (alimenti e quantitativi in gr)",
            required: true,
        },
        {
            id: "fuori_pasto",
            type: "textarea",
            label: "Cosa mangi fuori pasto?",
            hint: "Snack, dolci, frutta, bevande zuccherate, ecc.",
            required: false,
        },
        {
            id: "weekend",
            type: "textarea",
            label: "Elencami cosa mangi nel weekend e se ti capita di non rispettare la dieta per più giorni o pasti",
            required: true,
        },

        // ─── Bevande & abitudini ──────────────────────────────────
        {
            id: "acqua_lontano_pasti",
            type: "text",
            label: "Quanta acqua bevi lontano dai pasti?",
            hint: "Es. 1.5L, 2L, ecc.",
            required: true,
        },
        {
            id: "caffe_giorno",
            type: "text",
            label: "Quanti caffè bevi al giorno? Sono zuccherati?",
            required: true,
        },
        {
            id: "alcol",
            type: "radio",
            label: "Bevi alcolici?",
            required: true,
            options: [
                "Mai",
                "Occasionalmente (1-2 volte al mese)",
                "Settimanalmente (1-3 unità)",
                "Spesso (4+ unità a settimana)",
            ],
        },
        {
            id: "vegetariano",
            type: "radio",
            label: "Sei vegetariano/a o vegano/a?",
            required: true,
            options: [
                "No, mangio tutto",
                "Vegetariano/a",
                "Vegano/a",
                "Pescetariano/a",
                "Altra restrizione (specificare nelle note)",
            ],
        },

        // ─── Preferenze & obiettivi ──────────────────────────────
        {
            id: "alimenti_amati",
            type: "textarea",
            label: "Alimenti preferiti / che vorresti includere nel piano",
            required: false,
        },
        {
            id: "alimenti_evitati",
            type: "textarea",
            label: "Alimenti che NON ti piacciono o vuoi evitare",
            hint: "Anche per preferenza personale, non solo allergie",
            required: false,
        },
        {
            id: "obiettivo_dietetico",
            type: "radio",
            label: "Obiettivo principale del piano alimentare",
            required: true,
            options: [
                "Dimagrimento",
                "Aumento massa",
                "Ricomposizione corporea",
                "Mantenimento",
                "Benessere generale",
            ],
        },
        {
            id: "stile_vita_giornaliero",
            type: "textarea",
            label: "Descrivi il tuo stile di vita giornaliero: orari di sveglia/sonno, lavoro, attività",
            required: false,
        },
    ],
};

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL not set");
    }
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
        const trainers = await client.query<{ id: number }>(
            "SELECT id FROM trainers"
        );
        console.log(`Found ${trainers.rows.length} trainers`);

        let created = 0;
        let skipped = 0;
        for (const t of trainers.rows) {
            const existing = await client.query(
                `SELECT id FROM questionnaire_templates
                 WHERE trainer_id = $1 AND tipo = 'salute_nutrizione' AND is_active = true
                 LIMIT 1`,
                [t.id]
            );
            if (existing.rows.length > 0) {
                skipped++;
                continue;
            }
            await client.query(
                `INSERT INTO questionnaire_templates
                 (trainer_id, nome, tipo, descrizione, schema_json)
                 VALUES ($1, $2, 'salute_nutrizione', $3, $4)`,
                [
                    t.id,
                    "SALUTE & NUTRIZIONE",
                    "Anamnesi alimentare iniziale: salute, abitudini, preferenze. Necessario per costruire un piano alimentare personalizzato.",
                    JSON.stringify(SALUTE_NUTRIZIONE_SCHEMA),
                ]
            );
            created++;
        }
        console.log(`✓ Created ${created}, skipped ${skipped} (already present)`);
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

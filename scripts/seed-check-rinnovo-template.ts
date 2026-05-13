import "dotenv/config";
import { Client } from "pg";

/**
 * Seed del template "CHECK RINNOVO" per ogni trainer che non lo ha già.
 * Sicuro da rilanciare: skippa i trainer che lo hanno già.
 *
 * Lo schema è ispirato al questionario CHECK RINNOVO di Warfit:
 * anamnesi attuale, allenamento, alimentazione, integratori, foto progressi.
 */

const CHECK_RINNOVO_SCHEMA = {
    sections: [
        {
            id: "personali",
            title: "Dati personali",
            question_ids: ["nome_cognome", "eta", "peso", "altezza"],
        },
        {
            id: "stile_vita",
            title: "Stile di vita",
            question_ids: ["lavoro", "stile_vita", "infortuni"],
        },
        {
            id: "allenamento",
            title: "Allenamento",
            question_ids: [
                "anni_allenamento",
                "fermo_da",
                "allenamento_attuale",
                "giorni_settimana",
                "tempo_disponibile",
                "luogo_allenamento",
                "obiettivo",
            ],
        },
        {
            id: "alimentazione",
            title: "Alimentazione",
            question_ids: [
                "alimentazione_seguita",
                "weekend_alimentazione",
                "pasti_giornalieri",
                "vegetariano",
                "acqua",
                "allergie",
                "integratori",
            ],
        },
        {
            id: "progressi",
            title: "Progressi & valutazione",
            question_ids: [
                "settimane_completate",
                "scala_impegno",
                "foto_frontale",
                "foto_laterale",
                "foto_spalle",
            ],
        },
        {
            id: "consensi",
            title: "Consensi",
            question_ids: ["confirm_basic", "confirm_tempi", "confirm_foto"],
        },
    ],
    questions: [
        // Dati personali
        { id: "nome_cognome", type: "text", label: "Nome e cognome", required: true },
        { id: "eta", type: "number", label: "Età", required: true },
        { id: "peso", type: "number", label: "Peso (kg) a digiuno", required: true, hint: "Misurato al mattino, dopo essere andato in bagno" },
        { id: "altezza", type: "number", label: "Altezza (cm)", required: true },

        // Stile di vita
        { id: "lavoro", type: "textarea", label: "Descrivi il tuo lavoro e quanto ti mantiene attivo durante il giorno", required: true },
        { id: "stile_vita", type: "textarea", label: "Indicami il tuo stile di vita attuale (passi, stress, sonno)", required: false },
        { id: "infortuni", type: "textarea", label: "Infortuni, operazioni o altri problemi fisici sia passati che attuali", required: true },

        // Allenamento
        {
            id: "anni_allenamento",
            type: "radio",
            label: "Da quanto tempo ti alleni con i pesi?",
            required: true,
            options: [
                "Non mi alleno da tanto / Mai allenato",
                "Meno di 6 mesi",
                "6-12 mesi",
                "1-2 anni",
                "2-4 anni",
                "4+ anni",
            ],
        },
        {
            id: "fermo_da",
            type: "radio",
            label: "Se non ti alleni da tempo, scrivimi da quanto tempo sei fermo/a",
            required: false,
            options: ["Meno di 6 mesi", "6-12 mesi", "1-2 anni", "2-4 anni", "4+ anni"],
        },
        {
            id: "allenamento_attuale",
            type: "textarea",
            label: "Parlami in breve dell'allenamento che stai facendo attualmente",
            hint: "Quante volte a settimana, com'è impostato, se fai lavoro aerobico (quanto)",
            required: true,
        },
        {
            id: "giorni_settimana",
            type: "radio",
            label: "Quanti giorni hai a disposizione per allenarti?",
            hint: "La frequenza effettiva verrà stabilita dal coach in base al tuo livello, recupero e obiettivi",
            required: true,
            options: ["2", "3", "4", "5", "6", "7"],
        },
        {
            id: "tempo_disponibile",
            type: "radio",
            label: "Quanto tempo hai a disposizione per allenamento?",
            required: true,
            options: ["45-60 min totali", "60-75 min totali", "75-90 min totali", "90+ min totali"],
        },
        {
            id: "luogo_allenamento",
            type: "radio",
            label: "Ti allenerai in palestra o a casa? (non è possibile averli entrambi nella stessa scheda)",
            required: true,
            options: ["Palestra", "Casa"],
        },
        {
            id: "obiettivo",
            type: "textarea",
            label: "Che obiettivo vuoi raggiungere?",
            hint: "Dimagrimento, ipertrofia, ricomposizione corporea, benessere",
            required: true,
        },

        // Alimentazione
        {
            id: "alimentazione_seguita",
            type: "textarea",
            label: "Scrivimi un resoconto generale di com'è andata l'alimentazione",
            hint: "Anche se non vieni seguito/a da me con la dieta",
            required: true,
        },
        {
            id: "weekend_alimentazione",
            type: "text",
            label: "Stai riuscendo a rispettare l'alimentazione anche nel weekend?",
            required: true,
        },
        {
            id: "pasti_giornalieri",
            type: "number",
            label: "Quanti pasti al giorno stai riuscendo effettivamente a fare?",
            required: false,
        },
        { id: "vegetariano", type: "text", label: "Sei vegetariano/a o vegano/a?", required: false },
        { id: "acqua", type: "text", label: "Quanta acqua bevi lontano dai pasti?", required: true },
        { id: "allergie", type: "textarea", label: "Ricordami eventuali allergie/intolleranze diagnosticate", required: true },
        {
            id: "integratori",
            type: "textarea",
            label: "Quali integratori hai scelto di utilizzare in queste ultime 8-10 settimane?",
            hint: "Elencami tutti",
            required: true,
        },

        // Progressi & valutazione
        {
            id: "settimane_completate",
            type: "number",
            label: "Scrivimi concretamente quante settimane (delle 10-12) sei riuscito/a a fare al 100%",
            required: true,
        },
        {
            id: "scala_impegno",
            type: "scale",
            label: "In una scala da 1 a 10 quanto realmente ti sei impegnato/a?",
            required: true,
            min: 1,
            max: 10,
        },
        { id: "foto_frontale", type: "upload", label: "Foto frontale (con braccia lungo i fianchi)", required: true },
        { id: "foto_laterale", type: "upload", label: "Foto laterale (braccia che non coprono il girovita)", required: true },
        { id: "foto_spalle", type: "upload", label: "Foto di spalle (braccia lungo i fianchi)", required: true },

        // Consensi
        {
            id: "confirm_basic",
            type: "confirm",
            label: "Ho capito che se ho la programmazione BASIC SCHEDA non riceverò né la dieta né il supporto via chat",
            required: true,
        },
        {
            id: "confirm_tempi",
            type: "confirm",
            label: "Ho capito che riceverò la programmazione entro la fine del settimo giorno LAVORATIVO (non contare il giorno d'acquisto, sabato, domenica e giorni festivi)",
            required: true,
        },
        {
            id: "confirm_foto",
            type: "confirm",
            label: "Ho capito che le foto devono essere sempre fatte come quelle iniziali (stesse posizioni, stessa luce)",
            required: true,
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
        const trainers = await client.query<{ id: number }>("SELECT id FROM trainers");
        console.log(`Found ${trainers.rows.length} trainers`);

        let created = 0;
        let skipped = 0;
        for (const t of trainers.rows) {
            const existing = await client.query(
                `SELECT id FROM questionnaire_templates
                 WHERE trainer_id = $1 AND tipo = 'check_rinnovo' LIMIT 1`,
                [t.id]
            );
            if (existing.rows.length > 0) {
                skipped++;
                continue;
            }
            await client.query(
                `INSERT INTO questionnaire_templates
                 (trainer_id, nome, tipo, descrizione, schema_json)
                 VALUES ($1, $2, 'check_rinnovo', $3, $4)`,
                [
                    t.id,
                    "CHECK RINNOVO",
                    "Questionario di valutazione per il rinnovo della programmazione (mandato 6 e 2 settimane prima della scadenza abbonamento).",
                    JSON.stringify(CHECK_RINNOVO_SCHEMA),
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

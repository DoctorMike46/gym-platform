import "dotenv/config";
import { Client } from "pg";

async function main() {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
        const { rows } = await client.query<{
            id: number;
            email: string;
            nome: string;
            cognome: string;
            trainer_id: number;
            last_login_at: Date | null;
        }>(
            `SELECT id, email, nome, cognome, trainer_id, last_login_at
             FROM clients
             WHERE is_active = true AND password_hash IS NOT NULL
             ORDER BY (last_login_at IS NULL), last_login_at DESC, id
             LIMIT 20`
        );
        if (rows.length === 0) {
            console.log("Nessun cliente onboarded trovato.");
            return;
        }
        console.log(`Clienti che possono fare login (${rows.length}):\n`);
        for (const r of rows) {
            const last = r.last_login_at
                ? r.last_login_at.toISOString().slice(0, 16).replace("T", " ")
                : "mai";
            console.log(
                `  #${r.id}  ${r.email.padEnd(40)} ${r.nome} ${r.cognome} (trainer #${r.trainer_id}, last login: ${last})`
            );
        }
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

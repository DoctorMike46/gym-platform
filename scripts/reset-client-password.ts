import "dotenv/config";
import bcrypt from "bcryptjs";
import { Client } from "pg";

const TARGET_EMAIL = process.argv[2] || "michelespinelli46@gmail.com";
const NEW_PASSWORD = process.argv[3] || "Test12345!";

async function main() {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
        const hash = await bcrypt.hash(NEW_PASSWORD, 10);

        // Usa now() del DB (UTC) per evitare shift di timezone tra driver pg e
        // colonne `timestamp without time zone`. Se passassimo `new Date()` come
        // parametro, il driver lo convertirebbe in local time del client e poi
        // il backend lo rileggerebbe come UTC, generando un offset.
        const { rows } = await client.query<{ id: number; nome: string; cognome: string }>(
            `UPDATE clients
             SET password_hash = $1,
                 password_changed_at = now(),
                 password_set_at = COALESCE(password_set_at, now()),
                 is_active = true
             WHERE email = $2
             RETURNING id, nome, cognome`,
            [hash, TARGET_EMAIL]
        );

        const now = new Date();

        if (rows.length === 0) {
            console.log(`Nessun cliente trovato con email ${TARGET_EMAIL}`);
            process.exit(1);
        }

        const c = rows[0];
        console.log(`✓ Password aggiornata per ${c.nome} ${c.cognome} (#${c.id})`);

        // Revoca eventuali refresh token mobile attivi (se la tabella esiste)
        try {
            const { rowCount } = await client.query(
                `UPDATE client_refresh_tokens
                 SET revoked_at = $1
                 WHERE client_id = $2 AND revoked_at IS NULL`,
                [now, c.id]
            );
            if (rowCount && rowCount > 0) {
                console.log(`✓ Revocati ${rowCount} refresh token mobile`);
            }
        } catch {/* tabella inesistente, skip */}

        console.log(`\nCredenziali login:`);
        console.log(`  Email:    ${TARGET_EMAIL}`);
        console.log(`  Password: ${NEW_PASSWORD}`);
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

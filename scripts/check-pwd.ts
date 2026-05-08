import "dotenv/config";
import { Client } from "pg";

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const { rows } = await client.query(
        `SELECT id, email, password_changed_at, password_set_at,
                EXTRACT(EPOCH FROM password_changed_at) * 1000 AS pwd_ms,
                EXTRACT(EPOCH FROM now()) * 1000 AS now_ms,
                now() AS server_now,
                EXTRACT(EPOCH FROM (now() - password_changed_at)) AS diff_seconds
         FROM clients WHERE email = $1`,
        ["michelespinelli46@gmail.com"]
    );
    console.log(JSON.stringify(rows[0], null, 2));
    await client.end();
}
main();

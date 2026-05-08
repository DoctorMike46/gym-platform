import "dotenv/config";
import { Client } from "pg";

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const { rows } = await client.query(
        `SELECT current_setting('TimeZone') AS tz,
                now() AS now_pg,
                pg_typeof(password_changed_at) AS col_type,
                password_changed_at::text AS pwd_raw,
                password_changed_at AT TIME ZONE 'UTC' AS pwd_as_utc
         FROM clients WHERE email = 'michelespinelli46@gmail.com'`
    );
    console.log(JSON.stringify(rows[0], null, 2));
    await client.end();
}
main();

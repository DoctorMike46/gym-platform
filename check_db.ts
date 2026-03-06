import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" }); // just in case
import { db } from "./src/db/index";
import { workout_templates, workout_template_exercises } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function check() {
  try {
    const templates = await db.select().from(workout_templates);
    const exercises = await db.select().from(workout_template_exercises);
    console.log("TEMPLATES:", templates.length);
    console.log("EXERCISES:", exercises.length);
    console.log(exercises.slice(0, 3));
    process.exit();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();

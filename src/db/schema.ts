import { pgTable, serial, text, integer, boolean, timestamp, jsonb, date, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Trainers ────────────────────────────────────────────
export const trainers = pgTable("trainers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  nome: text("nome"),
  role: text("role").default("trainer").notNull(),
  password_changed_at: timestamp("password_changed_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Settings (per trainer) ──────────────────────────────
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
  site_name: text("site_name").default("Ernesto Performance").notNull(),
  logo_url: text("logo_url"),
  sidebar_logo_url: text("sidebar_logo_url"),
  primary_color: text("primary_color").default("#003366").notNull(),
  sidebar_color: text("sidebar_color").default("#003366").notNull(),
  secondary_color: text("secondary_color"),
  // PDF Customizable Texts
  pdf_services_intro_title: text("pdf_services_intro_title"),
  pdf_services_intro_text: text("pdf_services_intro_text"),
  pdf_services_rules: text("pdf_services_rules"),
  pdf_services_start: text("pdf_services_start"),
  pdf_workouts_footer: text("pdf_workouts_footer"),
  // Notifiche
  notifications_workout_logs: boolean("notifications_workout_logs").default(false).notNull(),
});

// ─── Clients (multi-tenant) ─────────────────────────────
export const clients = pgTable(
  "clients",
  {
    id: serial("id").primaryKey(),
    trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
    nome: text("nome").notNull(),
    cognome: text("cognome").notNull(),
    email: text("email").notNull(),
    telefono: text("telefono"),
    peso: text("peso"),
    altezza: text("altezza"),
    eta: integer("eta"),
    data_di_nascita: date("data_di_nascita"),
    anamnesi_status: text("anamnesi_status").default("non firmato").notNull(),
    // Portal access
    password_hash: text("password_hash"),
    password_set_at: timestamp("password_set_at"),
    password_changed_at: timestamp("password_changed_at"),
    last_login_at: timestamp("last_login_at"),
    invite_token: text("invite_token"),
    invite_token_expires_at: timestamp("invite_token_expires_at"),
    is_active: boolean("is_active").default(true).notNull(),
    portal_terms_accepted_at: timestamp("portal_terms_accepted_at"),
    // GDPR consents (art. 6/7/9)
    privacy_accepted_at: timestamp("privacy_accepted_at"),
    health_data_consent_at: timestamp("health_data_consent_at"),
    marketing_consent_at: timestamp("marketing_consent_at"),
    // Soft-delete tombstone (account cancellato dal cliente)
    deleted_at: timestamp("deleted_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    trainerEmailIdx: uniqueIndex("clients_trainer_email_idx").on(t.trainer_id, t.email),
    inviteTokenIdx: index("clients_invite_token_idx").on(t.invite_token),
    deletedAtIdx: index("clients_deleted_at_idx").on(t.deleted_at),
  })
);

// ─── Exercises (multi-tenant) ────────────────────────────
export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
  nome: text("nome").notNull(),
  gruppo_muscolare: text("gruppo_muscolare"),
  video_url: text("video_url"),
  descrizione: text("descrizione"),
  istruzioni_step_by_step: jsonb("istruzioni_step_by_step"),
});

// ─── Workout Templates (multi-tenant) ───────────────────
export const workout_templates = pgTable("workout_templates", {
  id: serial("id").primaryKey(),
  trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
  nome_template: text("nome_template").notNull(),
  split_settimanale: integer("split_settimanale"),
  note_progressione: text("note_progressione").default("Aumento ripetizioni: +1-2 rip finché arrivi al top range, poi aumenta il carico"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const workout_template_exercises = pgTable("workout_template_exercises", {
  id: serial("id").primaryKey(),
  template_id: integer("template_id").references(() => workout_templates.id, { onDelete: 'cascade' }).notNull(),
  exercise_id: integer("exercise_id").references(() => exercises.id, { onDelete: 'cascade' }).notNull(),
  giorno: integer("giorno").default(1).notNull(),
  ordine: integer("ordine").default(0).notNull(),
  serie: text("serie"),
  ripetizioni: text("ripetizioni"),
  recupero: text("recupero"),
  rpe: text("rpe"),
  note_tecniche: text("note_tecniche"),
});

// ─── Services (multi-tenant) ────────────────────────────
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
  nome_servizio: text("nome_servizio").notNull(),
  categoria: text("categoria").default("Generale").notNull(),
  prezzo: integer("prezzo").notNull(),
  descrizione_breve: text("descrizione_breve"),
  caratteristiche: text("caratteristiche"),
  durata_settimane: integer("durata_settimane"),
  include_coaching: boolean("include_coaching").default(false),
  is_active: boolean("is_active").default(true).notNull(),
});

// ─── Subscriptions ──────────────────────────────────────
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  service_id: integer("service_id").references(() => services.id).notNull(),
  data_inizio: date("data_inizio").notNull(),
  data_fine: date("data_fine"),
  status: text("status").default("attivo").notNull(),
});

// ─── Client Workout Assignments ─────────────────────────
export const client_workout_assignments = pgTable("client_workout_assignments", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  template_id: integer("template_id").references(() => workout_templates.id, { onDelete: 'cascade' }).notNull(),
  data_assegnazione: date("data_assegnazione").defaultNow().notNull(),
  note: text("note"),
  attivo: boolean("attivo").default(true).notNull(),
});

// ─── Documents (Cloudflare R2) ──────────────────────────
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
  client_id: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  tipo_documento: text("tipo_documento").notNull(), // 'consenso' | 'scheda' | 'foto_progresso'
  nome_file: text("nome_file").notNull(),
  r2_key: text("r2_key").notNull(),
  r2_url: text("r2_url"),
  mime_type: text("mime_type"),
  dimensione_bytes: integer("dimensione_bytes"),
  note: text("note"),
  data_documento: date("data_documento").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Password Reset Tokens ──────────────────────────────
export const password_reset_tokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  trainer_id: integer("trainer_id").references(() => trainers.id, { onDelete: 'cascade' }).notNull(),
  token: text("token").notNull().unique(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Announcements (multi-tenant) ───────────────────────
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
  titolo: text("titolo").notNull(),
  contenuto: text("contenuto").notNull(),
  tipo: text("tipo").default("annuncio").notNull(), // 'annuncio' | 'offerta'
  destinatari: text("destinatari").default("tutti").notNull(), // 'tutti' | 'selezionati'
  email_inviata: boolean("email_inviata").default(false).notNull(),
  pubblicato: boolean("pubblicato").default(false).notNull(),
  image_r2_key: text("image_r2_key"),
  image_filename: text("image_filename"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const announcement_recipients = pgTable("announcement_recipients", {
  id: serial("id").primaryKey(),
  announcement_id: integer("announcement_id").references(() => announcements.id, { onDelete: 'cascade' }).notNull(),
  client_id: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
});

// ─── Body Measurements (client portal) ──────────────────
// Le colonne `*_enc` sono shadow GDPR art.9 (vedi src/lib/crypto.ts).
// Durante la migrazione H4 si fa dual-write/dual-read; al termine le
// plain verranno droppate.
export const body_measurements = pgTable("body_measurements", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  date: date("date").notNull(),
  peso_kg: text("peso_kg"),
  body_fat_pct: text("body_fat_pct"),
  vita_cm: text("vita_cm"),
  fianchi_cm: text("fianchi_cm"),
  petto_cm: text("petto_cm"),
  braccio_cm: text("braccio_cm"),
  coscia_cm: text("coscia_cm"),
  // Shadow columns cifrate (H4)
  peso_kg_enc: text("peso_kg_enc"),
  body_fat_pct_enc: text("body_fat_pct_enc"),
  vita_cm_enc: text("vita_cm_enc"),
  fianchi_cm_enc: text("fianchi_cm_enc"),
  petto_cm_enc: text("petto_cm_enc"),
  braccio_cm_enc: text("braccio_cm_enc"),
  coscia_cm_enc: text("coscia_cm_enc"),
  note: text("note"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Client Health Samples (sync da Apple HealthKit / Health Connect) ──
// Granulare: una riga per ogni misurazione/timestamp/tipo.
// type: 'weight' | 'steps' | 'heart_rate_resting' | 'active_energy' | 'sleep_hours' | 'workout_minutes'
// source: 'apple_health' | 'health_connect' | 'manual'
export const client_health_samples = pgTable(
  "client_health_samples",
  {
    id: serial("id").primaryKey(),
    client_id: integer("client_id")
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    type: text("type").notNull(),
    value: text("value").notNull(),
    // Shadow column cifrata GDPR art.9 (H4) — vedi src/lib/crypto.ts
    value_enc: text("value_enc"),
    unit: text("unit").notNull(),
    recorded_at: timestamp("recorded_at").notNull(),
    source: text("source").notNull(),
    synced_at: timestamp("synced_at").defaultNow().notNull(),
  },
  (t) => ({
    clientTypeIdx: index("client_health_samples_client_type_idx").on(
      t.client_id,
      t.type,
      t.recorded_at
    ),
    // Evita duplicati al re-sync (stesso campione, stesso tipo, stessa fonte, stesso timestamp)
    dedupIdx: uniqueIndex("client_health_samples_dedup_idx").on(
      t.client_id,
      t.type,
      t.source,
      t.recorded_at
    ),
  })
);

// ─── Progress Photos ────────────────────────────────────
export const progress_photos = pgTable("progress_photos", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  date: date("date").notNull(),
  r2_key: text("r2_key").notNull(),
  type: text("type").notNull(), // 'front' | 'side' | 'back'
  note: text("note"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Workout Logs (sessione) ────────────────────────────
export const workout_logs = pgTable("workout_logs", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  assignment_id: integer("assignment_id").references(() => client_workout_assignments.id, { onDelete: 'set null' }),
  template_id: integer("template_id").references(() => workout_templates.id, { onDelete: 'set null' }),
  giorno: integer("giorno"),
  date_executed: date("date_executed").notNull(),
  status: text("status").default("in_progress").notNull(), // 'in_progress' | 'completed' | 'skipped'
  total_duration_seconds: integer("total_duration_seconds"),
  note: text("note"),
  trainer_note: text("trainer_note"),
  trainer_note_updated_at: timestamp("trainer_note_updated_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Workout Exercise Logs (per-esercizio) ──────────────
export const workout_exercise_logs = pgTable("workout_exercise_logs", {
  id: serial("id").primaryKey(),
  workout_log_id: integer("workout_log_id").references(() => workout_logs.id, { onDelete: 'cascade' }).notNull(),
  template_exercise_id: integer("template_exercise_id").references(() => workout_template_exercises.id, { onDelete: 'set null' }),
  ordine: integer("ordine").default(0).notNull(),
  sets_completed: integer("sets_completed").default(0).notNull(),
  reps_actual: jsonb("reps_actual"),
  weight_actual: jsonb("weight_actual"),
  rpe_actual: jsonb("rpe_actual"),
  note: text("note"),
});

// ─── Workout exercise log attachments (foto/video per esercizio) ─────
// kind: 'image' | 'video'
// r2_key: clients/<clientId>/workouts/<exerciseLogId>/<ts>_<filename>
export const workout_exercise_log_attachments = pgTable(
  "workout_exercise_log_attachments",
  {
    id: serial("id").primaryKey(),
    exercise_log_id: integer("exercise_log_id")
      .references(() => workout_exercise_logs.id, { onDelete: 'cascade' })
      .notNull(),
    client_id: integer("client_id")
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
    r2_key: text("r2_key").notNull(),
    mime_type: text("mime_type").notNull(),
    kind: text("kind").notNull(),
    filename: text("filename"),
    size_bytes: integer("size_bytes"),
    duration_seconds: integer("duration_seconds"),
    uploaded_at: timestamp("uploaded_at").defaultNow().notNull(),
  },
  (t) => ({
    logIdx: index("workout_attachments_log_idx").on(t.exercise_log_id),
    clientIdx: index("workout_attachments_client_idx").on(
      t.client_id,
      t.uploaded_at
    ),
  })
);

// ─── Meal Plans (piani alimentari assegnati al cliente) ────────────
export const meal_plans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
  client_id: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  nome: text("nome").notNull(),
  attivo: boolean("attivo").default(true).notNull(),
  data_inizio: date("data_inizio").notNull(),
  data_fine: date("data_fine"),
  note: text("note"),
  // Target macros giornalieri (opzionali)
  kcal_target: integer("kcal_target"),
  proteine_g: integer("proteine_g"),
  carbo_g: integer("carbo_g"),
  grassi_g: integer("grassi_g"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Meal Plan Meals (pasti per giorno della settimana) ────────────
// momento: 'colazione' | 'spuntino_mat' | 'pranzo' | 'spuntino_pom' | 'cena' | 'pre_nanna'
// giorno_settimana: 1=Lun, ..., 7=Dom
// items (JSONB): array strutturato di alimenti del pasto, ognuno con
// proprie alternative scambiabili a parità di macros. Forma:
//   [{ alimento, quantita, kcal, proteine_g, carbo_g, grassi_g,
//      alternatives: [{ alimento, quantita, kcal, proteine_g, carbo_g, grassi_g }] }]
// `descrizione` rimane come riassunto testuale del pasto (retrocompatibilità).
export const meal_plan_meals = pgTable(
  "meal_plan_meals",
  {
    id: serial("id").primaryKey(),
    meal_plan_id: integer("meal_plan_id")
      .references(() => meal_plans.id, { onDelete: 'cascade' })
      .notNull(),
    giorno_settimana: integer("giorno_settimana").notNull(),
    momento: text("momento").notNull(),
    ordine: integer("ordine").default(0).notNull(),
    descrizione: text("descrizione").notNull(),
    kcal: integer("kcal"),
    proteine_g: integer("proteine_g"),
    carbo_g: integer("carbo_g"),
    grassi_g: integer("grassi_g"),
    note: text("note"),
    items: jsonb("items"),
  },
  (t) => ({
    planDayIdx: index("meal_plan_meals_plan_day_idx").on(
      t.meal_plan_id,
      t.giorno_settimana
    ),
  })
);

// ─── Client Nutrition Profile (1-a-1 con clients) ──────────────────
// Dati clinici/preferenze nutrizionali del cliente, separati da `clients`.
// allergeni/preferenze_alimenti/esclusioni_alimenti sono JSONB array di stringhe.
export const client_nutrition_profile = pgTable(
  "client_nutrition_profile",
  {
    id: serial("id").primaryKey(),
    client_id: integer("client_id")
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
    sesso: text("sesso"), // 'M' | 'F' | 'altro'
    livello_attivita: text("livello_attivita"), // 'sedentario' | 'leggero' | 'moderato' | 'intenso' | 'molto_intenso'
    obiettivo_default: text("obiettivo_default"), // 'definizione' | 'mantenimento' | 'massa' | 'ricomposizione'
    regime_alimentare: text("regime_alimentare"), // 'onnivoro' | 'vegetariano' | 'vegano' | 'pescetariano' | 'altro'
    allergeni: jsonb("allergeni"),
    intolleranze: text("intolleranze"),
    // Migrazione: array strutturato; sostituirà `intolleranze` text in una release futura.
    intolleranze_json: jsonb("intolleranze_json"),
    preferenze_alimenti: jsonb("preferenze_alimenti"),
    esclusioni_alimenti: jsonb("esclusioni_alimenti"),
    // Obiettivo esteso (richiesta piano alimentare).
    obiettivo_timeframe_settimane: integer("obiettivo_timeframe_settimane"),
    peso_target_kg_enc: text("peso_target_kg_enc"), // GDPR art.9
    motivazione: text("motivazione"),
    note_aggiuntive: text("note_aggiuntive"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  }
);

// ─── Client Lifestyle (1-a-1 con clients) ──────────────────
// Abitudini e stile di vita auto-dichiarati. Usati per personalizzare piani.
export const client_lifestyle = pgTable(
  "client_lifestyle",
  {
    id: serial("id").primaryKey(),
    client_id: integer("client_id")
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
    ore_sonno_medie: integer("ore_sonno_medie"),
    livello_stress: integer("livello_stress"), // 1..10 auto-dichiarato
    n_pasti_die: integer("n_pasti_die"),
    orari_pasti: jsonb("orari_pasti"), // ["08:00","13:00",...]
    occasioni_sociali_settimana: integer("occasioni_sociali_settimana"),
    consumo_acqua_litri: text("consumo_acqua_litri"),
    consumo_acqua_litri_enc: text("consumo_acqua_litri_enc"), // GDPR shadow
    fumo: text("fumo"), // 'no' | 'si' | 'ex'
    integratori: jsonb("integratori"), // [{ nome, dosaggio }]
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  }
);

// ─── Client Medical History (1-a-1 con clients) ─────────────
// GDPR art.9 — tutti i campi testo medici sono cifrati di default.
export const client_medical_history = pgTable(
  "client_medical_history",
  {
    id: serial("id").primaryKey(),
    client_id: integer("client_id")
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
    patologie_enc: text("patologie_enc"),
    farmaci_enc: text("farmaci_enc"),
    note_enc: text("note_enc"),
    disclaimer_accepted_at: timestamp("disclaimer_accepted_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  }
);

// ─── Client Injuries (N per cliente) ────────────────────────
// Infortuni attivi/recuperati. Mostrati nel builder schede per sicurezza.
// parte_corpo: 'spalla_sx'|'spalla_dx'|'gomito_sx'|'gomito_dx'|'polso_sx'|'polso_dx'
//              |'schiena_lombare'|'schiena_cervicale'|'schiena_dorsale'
//              |'anca_sx'|'anca_dx'|'ginocchio_sx'|'ginocchio_dx'|'caviglia_sx'|'caviglia_dx'
//              |'piede'|'mano'|'collo'|'altro'
// tipo: 'muscolare' | 'articolare' | 'tendine' | 'osseo' | 'altro'
// gravita: 'leggera' | 'media' | 'grave'
// stato: 'attivo' | 'recuperato'
export const client_injuries = pgTable(
  "client_injuries",
  {
    id: serial("id").primaryKey(),
    client_id: integer("client_id")
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
    parte_corpo: text("parte_corpo").notNull(),
    tipo: text("tipo"),
    gravita: text("gravita").notNull(),
    stato: text("stato").default("attivo").notNull(),
    data_evento: date("data_evento"),
    data_recupero: date("data_recupero"),
    note_enc: text("note_enc"), // GDPR art.9
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    clientStatoIdx: index("client_injuries_client_stato_idx").on(t.client_id, t.stato),
    trainerStatoIdx: index("client_injuries_trainer_stato_idx").on(t.trainer_id, t.stato),
  })
);

// ─── Nutrition Requests (richieste piano alimentare da client a trainer) ──
// Snapshot del wizard mobile cliente. Stato workflow: pending → in_review → approved/declined.
// I campi *_enc sono cifrati art.9 (dati medici/sanitari).
export const nutrition_requests = pgTable(
  "nutrition_requests",
  {
    id: serial("id").primaryKey(),
    client_id: integer("client_id")
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
    status: text("status").default("pending").notNull(), // 'pending'|'in_review'|'approved'|'declined'
    // Snapshot obiettivo
    obiettivo: text("obiettivo"),
    timeframe_settimane: integer("timeframe_settimane"),
    peso_target_kg_enc: text("peso_target_kg_enc"),
    motivazione: text("motivazione"),
    // Snapshot nutrizione
    regime_alimentare: text("regime_alimentare"),
    allergeni: jsonb("allergeni"),
    intolleranze: jsonb("intolleranze"),
    cibi_preferiti: jsonb("cibi_preferiti"),
    cibi_evitati: jsonb("cibi_evitati"),
    n_pasti_die: integer("n_pasti_die"),
    orari_pasti: jsonb("orari_pasti"),
    occasioni_sociali: integer("occasioni_sociali"),
    // Snapshot lifestyle
    ore_sonno: integer("ore_sonno"),
    livello_stress: integer("livello_stress"),
    consumo_acqua_litri_enc: text("consumo_acqua_litri_enc"),
    fumo: text("fumo"),
    integratori: jsonb("integratori"),
    // Snapshot medico (art.9)
    patologie_enc: text("patologie_enc"),
    farmaci_enc: text("farmaci_enc"),
    note_libere_enc: text("note_libere_enc"),
    // Workflow trainer
    trainer_decline_reason: text("trainer_decline_reason"),
    trainer_internal_note: text("trainer_internal_note"),
    linked_meal_plan_id: integer("linked_meal_plan_id").references(() => meal_plans.id, { onDelete: 'set null' }),
    requested_at: timestamp("requested_at").defaultNow().notNull(),
    reviewed_at: timestamp("reviewed_at"),
    decided_at: timestamp("decided_at"),
  },
  (t) => ({
    trainerStatusIdx: index("nutrition_requests_trainer_status_idx").on(t.trainer_id, t.status, t.requested_at),
    clientStatusIdx: index("nutrition_requests_client_status_idx").on(t.client_id, t.status),
  })
);

// ─── Foods Cache (Open Food Facts lookup cache) ──────────────────
// Cache locale di alimenti scaricati da Open Food Facts. Tutti i valori
// sono per 100g (standard OFF). Condiviso tra tutti i trainer (cache globale).
export const foods_cache = pgTable(
  "foods_cache",
  {
    id: serial("id").primaryKey(),
    off_id: text("off_id").unique(), // barcode/code di Open Food Facts (null se inserito manualmente)
    nome: text("nome").notNull(),
    brand: text("brand"),
    kcal_per_100g: integer("kcal_per_100g"),
    proteine_g: integer("proteine_g"),
    carbo_g: integer("carbo_g"),
    grassi_g: integer("grassi_g"),
    fibre_g: integer("fibre_g"),
    last_fetched_at: timestamp("last_fetched_at").defaultNow().notNull(),
  },
  (t) => ({
    nomeIdx: index("foods_cache_nome_idx").on(t.nome),
  })
);

// ─── Appointment Types (tipologie di sessione bookabili) ───────────
export const appointment_types = pgTable("appointment_types", {
  id: serial("id").primaryKey(),
  trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
  nome: text("nome").notNull(),
  descrizione: text("descrizione"),
  durata_minuti: integer("durata_minuti").notNull(),
  colore_hex: text("colore_hex").default("#3b82f6").notNull(),
  prezzo_centesimi: integer("prezzo_centesimi"),
  /** 'online' | 'in_presenza' | 'entrambi' */
  modalita: text("modalita").default("in_presenza").notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Availability Rules (orari ricorrenti settimanali del trainer) ──
export const availability_rules = pgTable(
  "availability_rules",
  {
    id: serial("id").primaryKey(),
    trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
    giorno_settimana: integer("giorno_settimana").notNull(), // 1=Lun … 7=Dom
    start_time: text("start_time").notNull(), // "HH:MM"
    end_time: text("end_time").notNull(),     // "HH:MM"
    is_active: boolean("is_active").default(true).notNull(),
  },
  (t) => ({
    trainerDayIdx: index("availability_rules_trainer_day_idx").on(
      t.trainer_id,
      t.giorno_settimana
    ),
  })
);

// ─── Availability Overrides (eccezioni: ferie / orari speciali) ────
// tipo: 'blocked' = giornata o fascia bloccata
//       'custom'  = fascia oraria personalizzata (sostituisce le rules per quel giorno)
export const availability_overrides = pgTable(
  "availability_overrides",
  {
    id: serial("id").primaryKey(),
    trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
    data: date("data").notNull(),
    tipo: text("tipo").notNull(), // 'blocked' | 'custom'
    start_time: text("start_time"), // null = blocco intera giornata
    end_time: text("end_time"),
    motivo: text("motivo"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    trainerDateIdx: index("availability_overrides_trainer_date_idx").on(
      t.trainer_id,
      t.data
    ),
  })
);

// ─── Appointments (prenotazioni cliente↔trainer) ────────────────────
// status: 'pending' | 'confirmed' | 'completed' |
//         'cancelled_client' | 'cancelled_trainer' | 'no_show'
export const appointments = pgTable(
  "appointments",
  {
    id: serial("id").primaryKey(),
    trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
    client_id: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
    appointment_type_id: integer("appointment_type_id")
      .references(() => appointment_types.id, { onDelete: 'set null' }),
    start_at: timestamp("start_at").notNull(),
    end_at: timestamp("end_at").notNull(),
    status: text("status").default("pending").notNull(),
    /** 'online' | 'in_presenza' (snapshot al momento della prenotazione) */
    modalita: text("modalita").default("in_presenza").notNull(),
    cliente_note: text("cliente_note"),
    trainer_note: text("trainer_note"),
    cancelled_reason: text("cancelled_reason"),
    confirmed_at: timestamp("confirmed_at"),
    cancelled_at: timestamp("cancelled_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    trainerStartIdx: index("appointments_trainer_start_idx").on(
      t.trainer_id,
      t.start_at
    ),
    clientStartIdx: index("appointments_client_start_idx").on(
      t.client_id,
      t.start_at
    ),
    statusIdx: index("appointments_status_idx").on(t.status),
  })
);

// ─── Questionnaire templates ──────────────────────────────────────
// tipo: 'check_rinnovo' | 'anamnesi' | 'feedback' | 'generico'
// schema_json: { questions: [{ id, type, label, required, options?, ... }] }
export const questionnaire_templates = pgTable("questionnaire_templates", {
  id: serial("id").primaryKey(),
  trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
  nome: text("nome").notNull(),
  tipo: text("tipo").default("generico").notNull(),
  descrizione: text("descrizione"),
  schema_json: jsonb("schema_json").notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Questionnaire assignments (cliente ↔ template) ───────────────
// status: 'pending' | 'completed' | 'expired'
export const questionnaire_assignments = pgTable(
  "questionnaire_assignments",
  {
    id: serial("id").primaryKey(),
    template_id: integer("template_id")
      .references(() => questionnaire_templates.id, { onDelete: 'cascade' })
      .notNull(),
    client_id: integer("client_id")
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
    status: text("status").default("pending").notNull(),
    motivo: text("motivo"), // es. "Scadenza abbonamento 02-03-2026"
    sent_at: timestamp("sent_at").defaultNow().notNull(),
    completed_at: timestamp("completed_at"),
    reminder_sent_at: timestamp("reminder_sent_at"),
    /** Riferimento opzionale a una subscription per evitare doppioni nel cron */
    subscription_id: integer("subscription_id").references(
      () => subscriptions.id,
      { onDelete: 'set null' }
    ),
  },
  (t) => ({
    clientStatusIdx: index("questionnaire_assignments_client_status_idx").on(
      t.client_id,
      t.status
    ),
    trainerStatusIdx: index("questionnaire_assignments_trainer_status_idx").on(
      t.trainer_id,
      t.status
    ),
  })
);

// ─── Questionnaire responses ──────────────────────────────────────
// response_json: { [questionId]: answer }
export const questionnaire_responses = pgTable("questionnaire_responses", {
  id: serial("id").primaryKey(),
  assignment_id: integer("assignment_id")
    .references(() => questionnaire_assignments.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  response_json: jsonb("response_json").notNull(),
  submitted_at: timestamp("submitted_at").defaultNow().notNull(),
});

// ─── Chat messages (trainer ↔ cliente) ─────────────────────────────
// sender_role: 'trainer' | 'client'
export const chat_messages = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
    client_id: integer("client_id")
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    sender_role: text("sender_role").notNull(),
    body: text("body").notNull(),
    attachment_r2_key: text("attachment_r2_key"),
    attachment_mime_type: text("attachment_mime_type"),
    read_at: timestamp("read_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    conversationIdx: index("chat_messages_conversation_idx").on(
      t.trainer_id,
      t.client_id,
      t.created_at
    ),
    unreadIdx: index("chat_messages_unread_idx").on(
      t.client_id,
      t.read_at,
      t.sender_role
    ),
  })
);

// ─── Client Password Reset Tokens ───────────────────────
export const client_password_reset_tokens = pgTable("client_password_reset_tokens", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  token: text("token").notNull().unique(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── Client Refresh Tokens (mobile app) ────────────────
export const client_refresh_tokens = pgTable(
  "client_refresh_tokens",
  {
    id: serial("id").primaryKey(),
    client_id: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
    token_hash: text("token_hash").notNull(),
    device_id: text("device_id"),
    user_agent: text("user_agent"),
    expires_at: timestamp("expires_at").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    last_used_at: timestamp("last_used_at"),
    revoked_at: timestamp("revoked_at"),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex("client_refresh_tokens_hash_idx").on(t.token_hash),
    clientIdx: index("client_refresh_tokens_client_idx").on(t.client_id),
  })
);

// ─── Client Devices (FCM push tokens) ──────────────────
export const client_devices = pgTable(
  "client_devices",
  {
    id: serial("id").primaryKey(),
    client_id: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
    fcm_token: text("fcm_token").notNull(),
    platform: text("platform").notNull(), // 'ios' | 'android'
    device_id: text("device_id"),
    app_version: text("app_version"),
    last_seen_at: timestamp("last_seen_at").defaultNow().notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    fcmTokenIdx: uniqueIndex("client_devices_fcm_token_idx").on(t.fcm_token),
    clientIdx: index("client_devices_client_idx").on(t.client_id),
  })
);

// ═══════════════════════════════════════════════════════════
// Relations
// ═══════════════════════════════════════════════════════════

export const trainersRelations = relations(trainers, ({ many }) => ({
  clients: many(clients),
  exercises: many(exercises),
  workout_templates: many(workout_templates),
  services: many(services),
  settings: many(settings),
  announcements: many(announcements),
  documents: many(documents),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  trainer: one(trainers, { fields: [clients.trainer_id], references: [trainers.id] }),
  subscriptions: many(subscriptions),
  workout_assignments: many(client_workout_assignments),
  documents: many(documents),
  body_measurements: many(body_measurements),
  progress_photos: many(progress_photos),
  workout_logs: many(workout_logs),
}));

export const bodyMeasurementsRelations = relations(body_measurements, ({ one }) => ({
  client: one(clients, { fields: [body_measurements.client_id], references: [clients.id] }),
}));

export const progressPhotosRelations = relations(progress_photos, ({ one }) => ({
  client: one(clients, { fields: [progress_photos.client_id], references: [clients.id] }),
}));

export const workoutLogsRelations = relations(workout_logs, ({ one, many }) => ({
  client: one(clients, { fields: [workout_logs.client_id], references: [clients.id] }),
  assignment: one(client_workout_assignments, { fields: [workout_logs.assignment_id], references: [client_workout_assignments.id] }),
  template: one(workout_templates, { fields: [workout_logs.template_id], references: [workout_templates.id] }),
  exercise_logs: many(workout_exercise_logs),
}));

export const workoutExerciseLogsRelations = relations(workout_exercise_logs, ({ one }) => ({
  workout_log: one(workout_logs, { fields: [workout_exercise_logs.workout_log_id], references: [workout_logs.id] }),
  template_exercise: one(workout_template_exercises, { fields: [workout_exercise_logs.template_exercise_id], references: [workout_template_exercises.id] }),
}));

export const clientPasswordResetTokensRelations = relations(client_password_reset_tokens, ({ one }) => ({
  client: one(clients, { fields: [client_password_reset_tokens.client_id], references: [clients.id] }),
}));

export const workoutTemplatesRelations = relations(workout_templates, ({ one, many }) => ({
  trainer: one(trainers, { fields: [workout_templates.trainer_id], references: [trainers.id] }),
  exercises: many(workout_template_exercises),
  assignments: many(client_workout_assignments),
}));

export const clientWorkoutAssignmentsRelations = relations(client_workout_assignments, ({ one }) => ({
  client: one(clients, { fields: [client_workout_assignments.client_id], references: [clients.id] }),
  template: one(workout_templates, { fields: [client_workout_assignments.template_id], references: [workout_templates.id] }),
}));

export const workoutTemplateExercisesRelations = relations(workout_template_exercises, ({ one }) => ({
  template: one(workout_templates, {
    fields: [workout_template_exercises.template_id],
    references: [workout_templates.id],
  }),
  exercise: one(exercises, {
    fields: [workout_template_exercises.exercise_id],
    references: [exercises.id],
  }),
}));

export const exercisesRelations = relations(exercises, ({ one }) => ({
  trainer: one(trainers, { fields: [exercises.trainer_id], references: [trainers.id] }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  trainer: one(trainers, { fields: [services.trainer_id], references: [trainers.id] }),
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  client: one(clients, {
    fields: [subscriptions.client_id],
    references: [clients.id],
  }),
  service: one(services, {
    fields: [subscriptions.service_id],
    references: [services.id],
  }),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  trainer: one(trainers, { fields: [settings.trainer_id], references: [trainers.id] }),
}));

export const announcementsRelations = relations(announcements, ({ one, many }) => ({
  trainer: one(trainers, { fields: [announcements.trainer_id], references: [trainers.id] }),
  recipients: many(announcement_recipients),
}));

export const announcementRecipientsRelations = relations(announcement_recipients, ({ one }) => ({
  announcement: one(announcements, { fields: [announcement_recipients.announcement_id], references: [announcements.id] }),
  client: one(clients, { fields: [announcement_recipients.client_id], references: [clients.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  trainer: one(trainers, { fields: [documents.trainer_id], references: [trainers.id] }),
  client: one(clients, { fields: [documents.client_id], references: [clients.id] }),
}));

export const clientLifestyleRelations = relations(client_lifestyle, ({ one }) => ({
  client: one(clients, { fields: [client_lifestyle.client_id], references: [clients.id] }),
  trainer: one(trainers, { fields: [client_lifestyle.trainer_id], references: [trainers.id] }),
}));

export const clientMedicalHistoryRelations = relations(client_medical_history, ({ one }) => ({
  client: one(clients, { fields: [client_medical_history.client_id], references: [clients.id] }),
  trainer: one(trainers, { fields: [client_medical_history.trainer_id], references: [trainers.id] }),
}));

export const clientInjuriesRelations = relations(client_injuries, ({ one }) => ({
  client: one(clients, { fields: [client_injuries.client_id], references: [clients.id] }),
  trainer: one(trainers, { fields: [client_injuries.trainer_id], references: [trainers.id] }),
}));

export const nutritionRequestsRelations = relations(nutrition_requests, ({ one }) => ({
  client: one(clients, { fields: [nutrition_requests.client_id], references: [clients.id] }),
  trainer: one(trainers, { fields: [nutrition_requests.trainer_id], references: [trainers.id] }),
  linked_meal_plan: one(meal_plans, { fields: [nutrition_requests.linked_meal_plan_id], references: [meal_plans.id] }),
}));

// ─── Audit Logs (GDPR art.9 — tracciamento accessi a dati sanitari) ──
// actor_type: 'trainer' | 'client' | 'system'
// action: namespaced, es. 'health.read', 'health.write', 'measurement.read',
//         'photo.read', 'gdpr.export', 'gdpr.delete'
// client_id: SEMPRE valorizzato quando l'azione riguarda dati di un cliente,
//            così si può rispondere a un'istanza art.15 (chi ha visto i miei dati?)
//            con una singola query indicizzata.
export const audit_logs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actor_type: text("actor_type").notNull(),
    actor_id: integer("actor_id"),
    action: text("action").notNull(),
    resource_type: text("resource_type").notNull(),
    resource_id: integer("resource_id"),
    client_id: integer("client_id"),
    metadata: jsonb("metadata"),
    ip_address: text("ip_address"),
    user_agent: text("user_agent"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    actorIdx: index("audit_logs_actor_idx").on(t.actor_type, t.actor_id, t.created_at),
    clientIdx: index("audit_logs_client_idx").on(t.client_id, t.created_at),
    actionIdx: index("audit_logs_action_idx").on(t.action, t.created_at),
  })
);

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
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    trainerEmailIdx: uniqueIndex("clients_trainer_email_idx").on(t.trainer_id, t.email),
    inviteTokenIdx: index("clients_invite_token_idx").on(t.invite_token),
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
  note: text("note"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

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

// ─── Client Password Reset Tokens ───────────────────────
export const client_password_reset_tokens = pgTable("client_password_reset_tokens", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  token: text("token").notNull().unique(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

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

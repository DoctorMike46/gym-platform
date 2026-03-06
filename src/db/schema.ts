import { pgTable, serial, text, integer, boolean, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Trainers ────────────────────────────────────────────
export const trainers = pgTable("trainers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  nome: text("nome"),
  role: text("role").default("trainer").notNull(),
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
});

// ─── Clients (multi-tenant) ─────────────────────────────
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  trainer_id: integer("trainer_id").references(() => trainers.id).notNull(),
  nome: text("nome").notNull(),
  cognome: text("cognome").notNull(),
  email: text("email").notNull(),
  peso: text("peso"),
  altezza: text("altezza"),
  eta: integer("eta"),
  data_di_nascita: date("data_di_nascita"),
  anamnesi_status: text("anamnesi_status").default("non firmato").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

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

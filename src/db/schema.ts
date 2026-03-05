import { pgTable, serial, text, integer, boolean, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  trainer_id: text("trainer_id").notNull(),
  site_name: text("site_name").default("Ernesto Performance").notNull(),
  logo_url: text("logo_url"),
  sidebar_logo_url: text("sidebar_logo_url"),
  primary_color: text("primary_color").default("#003366").notNull(),
  sidebar_color: text("sidebar_color").default("#003366").notNull(),
  secondary_color: text("secondary_color"),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cognome: text("cognome").notNull(),
  email: text("email").notNull().unique(),
  peso: text("peso"),
  altezza: text("altezza"),
  eta: integer("eta"),
  data_di_nascita: date("data_di_nascita"),
  anamnesi_status: text("anamnesi_status").default("non firmato").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  gruppo_muscolare: text("gruppo_muscolare"),
  video_url: text("video_url"),
  descrizione: text("descrizione"),
  istruzioni_step_by_step: jsonb("istruzioni_step_by_step"),
});

export const workout_templates = pgTable("workout_templates", {
  id: serial("id").primaryKey(),
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
  serie: text("serie"),
  ripetizioni: text("ripetizioni"),
  recupero: text("recupero"),
  rpe: text("rpe"),
  note_tecniche: text("note_tecniche"),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  nome_servizio: text("nome_servizio").notNull(),
  prezzo: integer("prezzo").notNull(),
  descrizione_breve: text("descrizione_breve"),
  durata_settimane: integer("durata_settimane"),
  include_coaching: boolean("include_coaching").default(false),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  service_id: integer("service_id").references(() => services.id).notNull(),
  data_inizio: date("data_inizio").notNull(),
  data_fine: date("data_fine"),
  status: text("status").default("attivo").notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  tipo_documento: text("tipo_documento").notNull(),
  firma_digitale_data: timestamp("firma_digitale_data"),
  pdf_url: text("pdf_url"),
});

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  subscriptions: many(subscriptions),
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

export const servicesRelations = relations(services, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

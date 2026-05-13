# Gym Platform

Piattaforma multi-tenant per personal trainer e clienti, composta da una
dashboard web (Next.js) per il trainer e da un'app mobile (Flutter) per
il cliente che si appoggiano allo stesso backend e database.

Il codice è organizzato in modo che ogni trainer (account amministratore)
gestisca i propri clienti, schede, abbonamenti e contenuti, mentre il
cliente accede esclusivamente attraverso l'app mobile per consultare la
propria scheda, registrare allenamenti, vedere progressi, scaricare
documenti, prenotare sessioni, compilare questionari e dialogare in chat.

## Indice

- [Architettura](#architettura)
- [Stack tecnologico](#stack-tecnologico)
- [Struttura del repository](#struttura-del-repository)
- [Setup di sviluppo](#setup-di-sviluppo)
- [Variabili d'ambiente](#variabili-dambiente)
- [Database e migrazioni](#database-e-migrazioni)
- [Autenticazione e sessioni](#autenticazione-e-sessioni)
- [Storage allegati (Cloudflare R2)](#storage-allegati-cloudflare-r2)
- [API mobile](#api-mobile)
- [App mobile (Flutter)](#app-mobile-flutter)
- [Job pianificati](#job-pianificati)
- [Conformità GDPR](#conformità-gdpr)
- [Test rapidi end-to-end](#test-rapidi-end-to-end)
- [Deploy](#deploy)
- [Note operative](#note-operative)

## Architettura

Tre componenti, un unico backend:

```
┌────────────────────────────┐        ┌────────────────────────────┐
│  Dashboard trainer         │        │  App mobile cliente        │
│  Next.js 15 App Router     │        │  Flutter + Riverpod        │
│  Cookie session (JWT)      │        │  Bearer JWT + refresh      │
└──────────────┬─────────────┘        └──────────────┬─────────────┘
               │                                     │
               │  /api/* (server actions, route      │  /api/v1/*
               │   handlers, REST per dashboard)     │   (REST mobile)
               ▼                                     ▼
        ┌──────────────────────────────────────────────────┐
        │  Next.js backend (route handlers + middleware)    │
        │  Drizzle ORM, JWT (jose), Resend, R2 SDK         │
        └──────────────────┬───────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
     ┌──────────────┐              ┌──────────────┐
     │  PostgreSQL  │              │ Cloudflare R2│
     │   (Neon)     │              │  bucket S3   │
     └──────────────┘              └──────────────┘
```

Il middleware (`src/middleware.ts`) divide il traffico in tre namespace:

- `/api/v1/*` — REST per l'app mobile, autenticato con Bearer token (JWT
  con audience `mobile`). Niente cookie, niente CSRF: ogni request porta
  con sé il proprio token in header.
- `/portal/*` — superficie pubblica decommissionata. Restano accessibili
  solo le route per attivazione account (`/portal/onboarding/[token]`),
  reset password e la landing pubblica `/portal` che invita allo
  scaricamento dell'app. Tutto il resto viene reindirizzato.
- Tutto il resto — dashboard trainer, protetta dal cookie `trainer_session`.

Il portale web cliente è stato rimosso: l'unica via di accesso per il
cliente è l'app mobile. La dashboard trainer rimane invece web-only ma
è responsive per essere usabile da telefono.

## Stack tecnologico

| Livello | Tecnologia | Versione di riferimento |
|--------|-----------|-------------------------|
| Backend / dashboard | Next.js (App Router, server actions) | 15.5 |
| Linguaggio | TypeScript | 5.x |
| ORM | Drizzle ORM | 0.45 |
| Database | PostgreSQL su Neon (con local Postgres opzionale via Docker) | 15+ |
| Auth | jose (JWT firmati HS256), bcryptjs | — |
| Storage allegati | Cloudflare R2 (S3-compatible) | — |
| Email transazionali | Resend | — |
| Rate limit | Upstash Redis | — |
| Mobile | Flutter + Riverpod + go_router + Dio | Flutter 3.x |
| Build mobile | image_picker, flutter_secure_storage, hive | — |
| Cron | Vercel Cron | — |
| UI dashboard | shadcn/ui (Radix), Tailwind 4, lucide-react | — |

## Struttura del repository

```
gym-platform/
├── src/
│   ├── app/                       Next.js App Router
│   │   ├── (root)/...             dashboard trainer (login, clients, workouts, ...)
│   │   ├── legal/                 informativa e termini (pubblici)
│   │   ├── portal/                landing pubblica + onboarding + reset password
│   │   └── api/
│   │       ├── v1/                REST mobile (auth Bearer)
│   │       ├── media/             redirect a signed URL per allegati
│   │       └── cron/              endpoint pianificati
│   ├── components/                componenti React condivisi
│   ├── db/
│   │   ├── schema.ts              schema Drizzle, tutte le tabelle
│   │   └── migrations/            SQL versionato
│   ├── lib/
│   │   ├── services/              logica di dominio (chiamata da actions e route)
│   │   ├── actions/                server actions per la dashboard
│   │   ├── r2.ts                  helper Cloudflare R2 + key generators
│   │   ├── api-auth.ts            verifica Bearer token + emissione JWT mobile
│   │   ├── client-auth.ts         JWT con audience client
│   │   ├── fcm.ts                 Firebase Admin (push)
│   │   ├── email.ts               template e invio email (Resend)
│   │   └── types/                 tipi condivisi tra layer
│   └── middleware.ts              routing/auth a livello edge
├── mobile/
│   └── lib/
│       ├── app/                   router e bootstrap
│       ├── core/                  network, theme, env, widget condivisi
│       └── features/              moduli verticali (workouts, chat, ...)
├── scripts/                       script tsx (migrazioni, seed, utility)
├── public/                        asset statici Next
├── drizzle.config.ts              configurazione drizzle-kit
├── docker-compose.yml             Postgres locale opzionale
├── vercel.json                    cron schedule
└── package.json
```

Le feature mobile attualmente presenti corrispondono uno-a-uno con quelle
del backend: `workouts`, `progress`, `chat`, `bookings`, `documents`,
`announcements`, `nutrition`, `questionnaires`, `packages`,
`subscriptions`, `privacy`, `profile`, `home`, `altro`, `onboarding`,
`auth`.

## Setup di sviluppo

### Prerequisiti

- Node.js 20 o superiore
- Flutter SDK 3.x (necessario solo se si lavora sull'app mobile)
- Accesso a un database PostgreSQL — opzioni:
  - una connessione Neon (consigliato anche in dev, è quella usata in CI/prod)
  - oppure il Postgres locale via `docker-compose up -d`
- Un account Cloudflare R2 con un bucket privato e una coppia di chiavi
  access key / secret access key
- Un account Resend (per email di invito cliente, reset password e
  notifiche workout)
- Opzionale: account Upstash Redis per il rate limit; in assenza il
  rate-limit silenziosamente passa-through

### Installazione

```bash
git clone <repo>
cd gym-platform
npm install
cp .env.example .env       # se non esiste, vedi sezione variabili d'ambiente
```

Crea o ottieni un `.env` con tutte le variabili descritte sotto. In
particolare `DATABASE_URL` e `JWT_SECRET` sono indispensabili anche per
avviare il dev server.

### Avvio

Backend / dashboard trainer:

```bash
npm run dev
```

Si avvia su `http://localhost:3000`. La home della dashboard è la pagina
di login del trainer; per accedere serve un trainer già seedato nel
database (vedi sezione database).

App mobile (in un altro terminale):

```bash
cd mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:3000
```

Per simulatore iOS: `flutter run -d "iPhone"`. Per Android emulator:
`flutter run -d emulator-...` (usare `10.0.2.2` al posto di `localhost`
nell'API base url, dato che `localhost` dentro l'emulator punta a sé
stesso).

## Variabili d'ambiente

Tutte le variabili sono lette server-side; le uniche esposte al browser
sono quelle prefissate con `NEXT_PUBLIC_`.

| Variabile | Obbligatoria | Descrizione |
|-----------|--------------|-------------|
| `DATABASE_URL` | sì | connection string Postgres (Neon o locale) |
| `JWT_SECRET` | sì | chiave HS256 per firmare sessioni trainer e mobile. Minimo 32 caratteri in produzione |
| `NEXT_PUBLIC_APP_URL` | sì | URL pubblico dell'app, usato in email e deep link |
| `RESEND_API_KEY` | sì in prod | API key Resend per email transazionali |
| `RESEND_FROM_EMAIL` | sì in prod | indirizzo "from" verificato su Resend |
| `R2_ACCOUNT_ID` | sì | account id Cloudflare per l'endpoint S3 |
| `R2_ACCESS_KEY_ID` | sì | access key del bucket R2 |
| `R2_SECRET_ACCESS_KEY` | sì | secret del bucket R2 |
| `R2_BUCKET_NAME` | no (default `gym-documents`) | nome del bucket |
| `UPSTASH_REDIS_REST_URL` | no | endpoint Upstash per rate limit |
| `UPSTASH_REDIS_REST_TOKEN` | no | token Upstash |
| `CRON_SECRET` | sì in prod | shared secret per autenticare le chiamate ai job cron oltre al check `x-vercel-cron` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | no | service account JSON inline per invio push |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | no | path al file JSON in alternativa al precedente |

Se le variabili Firebase non sono impostate, `sendPushToClient` diventa
un no-op silenzioso e il resto del sistema continua a funzionare. Tutta
la pipeline notifiche è in attesa di un progetto Firebase e di un Apple
Developer Account per essere completata lato mobile.

## Database e migrazioni

Lo schema Drizzle si trova in `src/db/schema.ts`. Le migrazioni SQL sono
in `src/db/migrations/`, numerate in ordine cronologico:

| File | Contenuto |
|------|-----------|
| `0000_high_puck.sql` | schema iniziale (trainer, clienti, schede, esercizi, ecc.) |
| `0001_portal_v1.sql` | portale cliente (poi decommissionato) |
| `0002_workout_log_trainer_feedback.sql` | nota del trainer sui workout log |
| `0003_mobile_api.sql` | tabelle per l'app mobile (devices, refresh token) |
| `0004_nutrition_meal_plans.sql` | piani alimentari |
| `0005_appointments.sql` | tipologie appuntamento, regole di disponibilità, prenotazioni |
| `0006_chat.sql` | messaggi chat trainer-cliente |
| `0007_questionnaires.sql` | template e assegnazioni questionari |
| `0008_gdpr_consents.sql` | consensi separati per privacy / salute / marketing |
| `0009_workout_attachments.sql` | allegati foto/video per esercizio loggato |

Ogni migrazione ha uno script `tsx` corrispondente in `scripts/` che la
applica usando `pg` direttamente (sono volutamente idempotenti, fanno
`CREATE TABLE IF NOT EXISTS` e `ADD COLUMN IF NOT EXISTS`):

```bash
npx tsx scripts/apply-questionnaires-migration.ts
npx tsx scripts/apply-gdpr-migration.ts
npx tsx scripts/apply-workout-attachments-migration.ts
```

In alternativa `npm run db:migrate` lancia `scripts/migrate.ts` che
applica tutto in sequenza. Le migrazioni sono pensate per essere safe da
ri-eseguire anche su un DB già aggiornato.

### Seed

Due seed sono già pronti per i template questionari standard:

```bash
npx tsx scripts/seed-check-rinnovo-template.ts
npx tsx scripts/seed-salute-nutrizione-template.ts
```

Il primo crea il template "CHECK RINNOVO" usato dal cron di promemoria
scadenza abbonamento, il secondo un questionario di anamnesi nutrizionale
da inviare al cliente all'ingresso.

Non esiste un seed automatico per il trainer iniziale: si può creare
manualmente con uno script ad-hoc oppure inserendo direttamente la riga
in tabella `trainers` (password hashata con bcrypt cost 10).

## Autenticazione e sessioni

Il sistema usa due audience JWT distinte sulla stessa `JWT_SECRET`, così
da impedire che un token del trainer venga accettato come token cliente
e viceversa:

- audience `trainer` — emessa da `/api/auth/login` (form login dashboard),
  trasportata in cookie `trainer_session` (httpOnly, secure in prod,
  SameSite Lax), TTL 30 giorni. Verificata dal middleware prima di servire
  qualsiasi pagina protetta.
- audience `client` (alias `mobile`) — emessa da `/api/v1/auth/login`,
  ritornata nel body insieme a un refresh token. Il refresh token viene
  hashato e salvato in `client_refresh_tokens` con `device_id` e
  `user_agent`. Verificata route-by-route da `requireApiClientAuth` in
  `src/lib/api-auth.ts`.

Lato mobile, un interceptor Dio aggiunge automaticamente l'header
`Authorization: Bearer <accessToken>` e gestisce il refresh trasparente
su 401 (un'unica richiesta refresh in volo per evitare race).

L'onboarding cliente è un flusso a token:

1. Il trainer dalla dashboard crea il cliente e genera un invito.
2. Il backend invia un'email con link `/portal/onboarding/<token>`.
3. La pagina pubblica permette al cliente di impostare la propria
   password, accettare termini, privacy e consenso specifico al
   trattamento dei dati di salute (art. 9 GDPR).
4. Una volta attivato, l'utente scarica l'app e si logga con la mail già
   inserita e la password scelta.

Reset password: stesso pattern con `/portal/reset-password/<token>`.

## Storage allegati (Cloudflare R2)

R2 è usato come storage S3-compatibile per tutti i file binari. Le chiavi
seguono un path strutturato che permette ownership-check senza join sul DB:

```
clients/<clientId>/documents/<ts>_<filename>          documenti / certificati
clients/<clientId>/progress/<ts>_<type>_<filename>    foto progresso
clients/<clientId>/questionnaires/<assignmentId>/...  allegati risposta questionario
clients/<clientId>/workouts/<exerciseLogId>/...       allegati workout (foto/video)
announcements/<ts>_<filename>                          immagini annunci trainer
```

Il pattern operativo per gli upload mobile è sempre:

1. App chiede un signed PUT URL al backend (`/api/v1/.../presign`).
2. App esegue `PUT` direttamente verso R2 con i bytes — il signed URL ha
   una durata breve (10 minuti tipici) ed include il `Content-Type`.
3. App conferma al backend l'avvenuto upload con la `r2_key` ricevuta;
   il backend crea la riga DB collegata.

I download passano sempre per un signed GET URL temporaneo (un'ora). Per
il cliente l'endpoint è `/api/v1/media/signed?key=...`, per il trainer
ci sono endpoint dedicati che fanno il redirect 302 al signed URL
(es. `/api/media/workout-attachment`), così possono essere usati
direttamente come `<img src>` senza un secondo round-trip.

## API mobile

Tutto sotto `/api/v1/*`. Tutte le risposte hanno la forma
`{ data: ... }` per il successo o `{ error: { code, message } }` per
l'errore. Quel che segue è una mappa di alto livello; per i dettagli si
vedano le route handler.

### Autenticazione

| Metodo | Endpoint | Note |
|--------|----------|------|
| `POST` | `/api/v1/auth/login` | login con email+password, ritorna access+refresh |
| `POST` | `/api/v1/auth/refresh` | rinnova access token con refresh |
| `POST` | `/api/v1/auth/logout` | revoca il refresh token corrente |
| `POST` | `/api/v1/auth/forgot-password` | invia email di reset |
| `POST` | `/api/v1/auth/reset-password` | imposta nuova password da token |
| `POST` | `/api/v1/onboarding/validate` | verifica validità invito |
| `POST` | `/api/v1/onboarding/complete` | imposta password, salva consensi, emette tokens |

### Profilo cliente

| Metodo | Endpoint | Note |
|--------|----------|------|
| `GET` | `/api/v1/me` | profilo, branding del trainer, abbonamento attivo |
| `PATCH` | `/api/v1/me` | aggiorna telefono |
| `POST` | `/api/v1/me/password` | change password |
| `POST` | `/api/v1/me/devices` | registra device FCM (in attesa di Firebase) |

### Workout

| Metodo | Endpoint | Note |
|--------|----------|------|
| `GET` | `/api/v1/workouts/assignments` | schede assegnate |
| `GET` | `/api/v1/workouts/assignments/:id` | dettaglio scheda |
| `GET` | `/api/v1/workouts/assignments/:id/history` | storico log |
| `POST` | `/api/v1/workouts/sessions` | inizia sessione |
| `GET` | `/api/v1/workouts/sessions/:logId` | dettaglio sessione (con `attachments` per esercizio) |
| `PUT` | `/api/v1/workouts/sessions/:logId/exercises/:tplExerciseId` | autosave log esercizio |
| `POST` | `/api/v1/workouts/sessions/:logId/finish` | chiusura sessione |
| `POST` | `/api/v1/workouts/exercises/last-logs` | bulk ultimi log per template_exercise_id |
| `POST` | `/api/v1/workouts/sessions/:logId/exercises/:tplExerciseId/resolve-log` | crea exercise_log se manca (per allegati durante sessione) |
| `POST` | `/api/v1/workouts/exercise-logs/:id/attachments/presign` | richiede signed PUT URL |
| `POST` | `/api/v1/workouts/exercise-logs/:id/attachments` | conferma upload |
| `GET` | `/api/v1/workouts/exercise-logs/:id/attachments` | lista |
| `DELETE` | `/api/v1/workouts/attachments/:id` | elimina allegato (R2 + DB) |

### Progressi

| Metodo | Endpoint |
|--------|----------|
| `GET POST` | `/api/v1/progress/measurements` |
| `DELETE` | `/api/v1/progress/measurements/:id` |
| `GET POST` | `/api/v1/progress/photos` |
| `DELETE` | `/api/v1/progress/photos/:id` |
| `GET` | `/api/v1/progress/stats` |

### Contenuti

| Metodo | Endpoint |
|--------|----------|
| `GET` | `/api/v1/services` (pacchetti del trainer) |
| `GET` | `/api/v1/me/subscriptions` |
| `GET` | `/api/v1/me/nutrition/current` (piano alimentare attivo) |
| `GET` | `/api/v1/announcements` |
| `GET` | `/api/v1/documents`, `/api/v1/documents/:id/download` |
| `GET` | `/api/v1/me/questionnaires` (pending) |
| `GET POST` | `/api/v1/me/questionnaires/:id` `/submit` |
| `POST` | `/api/v1/me/questionnaires/:id/upload-presign` |

### Prenotazioni e chat

| Metodo | Endpoint |
|--------|----------|
| `GET` | `/api/v1/me/appointment-types` |
| `GET` | `/api/v1/me/availability/slots` |
| `GET POST` | `/api/v1/me/appointments` |
| `POST` | `/api/v1/me/appointments/:id/cancel` |
| `GET POST` | `/api/v1/me/chat/messages` |
| `GET` | `/api/v1/me/chat/stream` (Server-Sent Events) |

### Account e GDPR

| Metodo | Endpoint | Note |
|--------|----------|------|
| `GET PATCH` | `/api/v1/me/account/consents` | stato e revoca consenso marketing |
| `GET` | `/api/v1/me/account/export` | export integrale dei dati (art. 20) |
| `DELETE` | `/api/v1/me/account` | cancellazione account (art. 17) — richiede `confirm: "ELIMINA"` e password |

## App mobile (Flutter)

La struttura è feature-first: ogni feature in `mobile/lib/features/` ha
solitamente tre sottocartelle:

- `data/` — repository, API client, modelli (provider Riverpod inclusi)
- `domain/` — modelli di dominio quando opportuno (alcuni moduli leggeri
  tengono i modelli inline nel repository)
- `presentation/` — schermate, widget, controller (`StateNotifier` o
  `ConsumerStatefulWidget`)

`core/network/dio_client.dart` espone un singleton `Dio` configurato con
gli interceptor di auth e refresh. `core/theme/` contiene il theme
controller (light/dark/system) e i colori brand. Il routing è in
`app/router.dart`: una `ShellRoute` per la bottom nav (home, workouts,
nutrition, progress, altro) e rotte full-screen per i dettagli e i flussi
secondari.

Per build di produzione:

```bash
# iOS (richiede macOS + Xcode + Apple Developer Account)
flutter build ipa --dart-define=API_BASE_URL=https://tuo-dominio.it \
                  --dart-define=FLAVOR=prod

# Android
flutter build appbundle --dart-define=API_BASE_URL=https://tuo-dominio.it \
                        --dart-define=FLAVOR=prod
```

## Job pianificati

Configurati in `vercel.json` e implementati come route handler:

| Schedule | Endpoint | Cosa fa |
|----------|----------|---------|
| `0 7 * * *` | `/api/cron/check-rinnovo` | scandaglia gli abbonamenti, a 6 e 2 settimane dalla scadenza crea un'assegnazione del template "CHECK RINNOVO" e invia (se Firebase è configurato) una push promemoria |

Gli endpoint cron sono protetti in due modi: l'header
`x-vercel-cron` impostato automaticamente dall'infrastruttura Vercel,
oppure un header `Authorization: Bearer $CRON_SECRET` per chiamate
manuali / testing. In sviluppo locale:

```bash
curl -H "Authorization: Bearer dev-secret" http://localhost:3000/api/cron/check-rinnovo
```

## Conformità GDPR

Il flusso di onboarding raccoglie tre consensi separati:

- accettazione di Termini di Servizio e Privacy Policy (obbligatorio)
- consenso esplicito al trattamento dei dati di salute (art. 9 GDPR,
  obbligatorio per usare il servizio)
- consenso a comunicazioni di marketing (facoltativo, revocabile)

Sono salvati come timestamp distinti su `clients` (`portal_terms_accepted_at`,
`privacy_accepted_at`, `health_data_consent_at`, `marketing_consent_at`).

L'utente può in qualsiasi momento dalla schermata "Privacy e dati"
dell'app:

- consultare l'informativa (pagina pubblica `/legal/privacy`) e i termini
  (`/legal/terms`)
- vedere lo stato dei propri consensi
- revocare il consenso marketing
- scaricare un export JSON integrale dei propri dati (profilo, schede,
  log, progressi, allegati, chat, prenotazioni, questionari, piano
  alimentare)
- richiedere la cancellazione dell'account con riconferma password e
  digitando la parola `ELIMINA`. La cancellazione rimuove la riga
  `clients` (cascade DB su tutte le tabelle figlie), i token refresh,
  i device FCM e gli oggetti R2 collegati (documenti, foto progresso,
  allegati chat, allegati workout, allegati questionario).

I testi di Privacy Policy e Termini in `src/app/legal/` sono **template
generici** da revisionare con un consulente legale prima della messa in
produzione: contengono placeholder espliciti per ragione sociale, P.IVA,
sede e accordi DPA con i fornitori.

## Test rapidi end-to-end

Una volta avviato il dev server e applicate le migrazioni:

```bash
# 1. Login cliente (creato precedentemente dal trainer)
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"cliente@test.it","password":"Password123!"}' \
  | jq -r '.data.access_token')

# 2. Profilo
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/me | jq .

# 3. Schede
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/v1/workouts/assignments | jq .

# 4. Export GDPR (downloadabile come file)
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/v1/me/account/export \
     -o dati-personali.json
```

Per le route trainer-side il pattern è invece basato su cookie: si fa
login dal browser sulla dashboard e si possono ispezionare le chiamate
con i dev tools.

## Deploy

L'ambiente di riferimento è Vercel con database Neon. La configurazione
necessaria:

1. Importare il progetto su Vercel collegandolo al repository.
2. Impostare nelle env vars di Vercel tutte le variabili elencate nella
   sezione corrispondente (in particolare `CRON_SECRET`, `R2_*`,
   `RESEND_*` e una `JWT_SECRET` lunga e generata casualmente).
3. Eseguire le migrazioni contro il DB di produzione con gli script
   `scripts/apply-*.ts` (o `npm run db:migrate`) prima del primo deploy.
4. Verificare in Settings → Cron Jobs che lo schedule definito in
   `vercel.json` sia attivo.
5. (Facoltativo) collegare Cloudflare R2 e Resend in modalità produzione.

L'app mobile si distribuisce attraverso App Store e Play Store: i build
prodotti da `flutter build ipa` / `flutter build appbundle` con
`API_BASE_URL` puntato al dominio di produzione sono pronti per la
sottomissione, una volta configurate firme, bundle id e icone in
`mobile/ios/` e `mobile/android/`.

## Note operative

- **Logout server-side**: la rotazione della password (`password_changed_at`)
  invalida tutti i token con `iat` precedente, sia trainer che cliente.
  È il meccanismo usato per forzare il sign-out di tutti i device.
- **Multi-tenant**: ogni query lato trainer deve includere il filtro
  `trainer_id`. Gli helper in `src/lib/services/` lo applicano per
  costruzione; quando si scrivono nuove route bisogna mantenere lo
  stesso pattern e non fidarsi mai di un id passato dal client.
- **R2 ownership**: la convenzione del path `clients/<clientId>/...`
  permette di verificare la proprietà di un allegato senza join. Le
  route che restituiscono signed URL fanno comunque check sul match
  fra `clientId` nella key e `session.id`.
- **Server-Sent Events** della chat: la connessione è gestita con
  `ReadableStream` su Next.js e un fallback di polling è già integrato
  nel client Flutter, così la chat funziona anche dietro proxy che
  non supportano SSE.
- **Idempotenza autosave**: `PUT /workouts/sessions/.../exercises/...`
  fa upsert su `(workout_log_id, template_exercise_id)`. È pensato per
  essere chiamato di continuo dal session player mobile senza creare
  duplicati.
- **Notifiche push**: la pipeline backend è completa ma in attesa di
  integrazione Firebase lato mobile. Il fallback è la chat SSE in-app
  e i banner/badge visibili all'apertura dell'app.

# Data Protection Impact Assessment (DPIA)

**Titolare del trattamento**: [da compilare — nome, P.IVA, indirizzo]
**Versione**: 0.1 — bozza
**Ultimo aggiornamento**: 2026-05-17
**Prossima revisione**: [+12 mesi o al primo cambio sostanziale del trattamento]

> Questo è il documento di valutazione d'impatto richiesto dall'**art. 35 GDPR**.
> È obbligatorio perché la piattaforma tratta **categorie particolari di dati**
> (dati relativi alla salute, art. 9) **su larga scala** o in modo
> **sistematico** anche se la base utenti è piccola.
>
> Compilare ogni sezione "[da compilare]" prima della messa in produzione
> commerciale (oltre la fase MVP con utenti reali esterni al titolare).

---

## 1. Descrizione del trattamento

### 1.1 Finalità
- Erogazione del servizio di personal training e nutrizione personalizzata
- Tracciamento del progresso dell'allievo (misurazioni biometriche, foto, log allenamento, dati salute da Apple HealthKit / Health Connect)
- Comunicazione trainer ↔ cliente (chat, notifiche, questionari)

### 1.2 Natura dei dati trattati

| Categoria | Esempi | Base giuridica |
|---|---|---|
| Anagrafici | Nome, cognome, email, telefono, data di nascita | art. 6(1)(b) contratto |
| Identificativi tecnici | IP, user-agent (audit log), token sessione | art. 6(1)(f) legittimo interesse — sicurezza |
| **Categorie particolari art.9** — Dati sanitari | Peso, altezza, body fat, circonferenze, anamnesi, allergie | **art. 9(2)(a) consenso esplicito** |
| **Categorie particolari art.9** — Dati biometrici HealthKit/Health Connect | Frequenza cardiaca, sonno, passi, calorie attive, allenamenti | **art. 9(2)(a) consenso esplicito separato** |
| Foto progressi | Immagini biometriche (fronte/lato/posteriore) | art. 9(2)(a) consenso |
| Comunicazioni | Chat trainer-cliente, note, allegati | art. 6(1)(b) contratto |

### 1.3 Soggetti del trattamento
- **Interessati**: clienti dei trainer (atleti, allievi)
- **Titolare**: [da compilare — il trainer/società che usa la piattaforma]
- **Responsabili (art. 28)**:
  - Vercel Inc. (hosting Next.js, US — coperto da Data Privacy Framework EU-US)
  - Neon Inc. (database PostgreSQL, region EU `eu-central-1` Francoforte)
  - Cloudflare Inc. (storage R2 per documenti e foto; specificare jurisdiction EU se attivabile)
  - Upstash Inc. (cache/rate-limit Redis — verificare region EU)
  - Resend Inc. (email transazionali, US — **TRANSFER ART.49 da valutare**, in roadmap switch a provider EU)
  - Firebase / Google (push notification FCM, US — coperto da DPF)
  - OpenAI (LLM per generazione piani nutrizionali, US — verificare contenuti inviati, evitare PII)
  - Apple, Google (HealthKit/Health Connect — la sincronizzazione resta sul device, il backend riceve solo i sample autorizzati)

### 1.4 Flussi dei dati
1. Cliente installa app Flutter → autorizza accesso HealthKit/Health Connect → app legge sample → POST `/api/v1/me/health/sync` → cifrato AES-256-GCM at-rest in PostgreSQL Neon (EU)
2. Trainer accede al gestionale web Next.js (auth JWT cookie httpOnly) → legge misurazioni clienti (audit log persistito su ogni accesso)
3. Foto progressi → presigned URL → upload diretto su Cloudflare R2 (EU)

### 1.5 Durata conservazione (retention)
| Dato | Periodo |
|---|---|
| Account cliente attivo | per tutta la durata del rapporto + 6 mesi grace |
| Dati salute (`client_health_samples`, `body_measurements`) | cancellazione cascade a cancellazione account |
| Foto progressi (R2) | cancellazione automatica all'eliminazione cliente (verificato in [test E2E](../../scripts/test-gdpr-erasure.ts)) |
| Audit log accessi (`audit_logs`) | 12 mesi (env `AUDIT_LOG_RETENTION_DAYS`), cleanup automatico cron settimanale |
| Backup database | 7 giorni (Neon) + eventuali snapshot manuali tracciati |

---

## 2. Necessità e proporzionalità

- I dati raccolti sono **strettamente strumentali** all'erogazione del servizio
- Nessuna profilazione automatizzata che produca effetti giuridici (art. 22)
- Nessun trasferimento extra-UE diretto di dati art.9 (eccezione: Resend per le email, contenuto controllato → mai PII sanitarie nelle email)
- Minimizzazione: non raccogliamo dati che non servono al servizio (es. nessuna geolocalizzazione, nessun social graph)

---

## 3. Rischi per i diritti e le libertà degli interessati

| # | Rischio | Probabilità | Impatto | Severità |
|---|---|---|---|---|
| R1 | Furto dati sanitari (database compromesso) | Bassa | **Critico** | Alta |
| R2 | Accesso non autorizzato di un trainer ai dati di clienti di un altro trainer (IDOR) | Bassa | Alto | Media |
| R3 | Token mobile rubato → impersonation cliente | Media | Medio | Media |
| R4 | Foto progressi diffuse pubblicamente (presigned URL leak) | Bassa | Alto | Media |
| R5 | Cancellazione cliente non completa (residui in R2 o tabelle figlie) | Bassa | Medio | Bassa |
| R6 | Trasferimento extra-UE per Resend email | Media (in corso) | Basso (no PII nelle email transazionali) | Bassa |
| R7 | Perdita ENCRYPTION_KEY → dati cifrati illeggibili | Bassa | **Critico** (data loss) | Alta |

---

## 4. Misure di mitigazione implementate

### Tecniche
- ✅ **Encryption at-rest a livello colonna** (AES-256-GCM) per peso, body fat, circonferenze, valori health (heart rate, sleep, ecc.) → [src/lib/crypto.ts](../../src/lib/crypto.ts)
- ✅ **Encryption in-transit** (HTTPS obbligatorio, HSTS preload)
- ✅ **Security headers** (HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- ✅ **Auth JWT** (HS256 firmato, fail-fast se `JWT_SECRET` non settato)
- ✅ **Rate-limit obbligatorio in prod** (5 login/min, 3 reset/h, 20 upload/min, via Upstash)
- ✅ **Audit log immutabile** per ogni accesso a dati art.9, con retention configurabile
- ✅ **Multi-tenancy enforced** in tutte le query (filtro `trainer_id` obbligatorio)
- ✅ **Soft delete** su `clients` + cascade DB su tutte le tabelle figlie + cleanup R2 best-effort
- ✅ **Verifica E2E del diritto all'oblio** ([scripts/test-gdpr-erasure.ts](../../scripts/test-gdpr-erasure.ts))
- ⚠️ **Cert pinning Flutter mobile**: da implementare (H3)
- ⚠️ **Biometric auth Flutter (FaceID/TouchID)**: da implementare (H7)

### Organizzative
- ✅ **Consenso esplicito separato** per salute (`health_data_consent_at`), marketing (`marketing_consent_at`), privacy generale
- ✅ **Diritto art.20**: export integrale dei dati personali in formato JSON (`/api/v1/me/account/export`)
- ✅ **Diritto art.17**: cancellazione completa account + dati biometrici + foto R2
- ⚠️ **Procedura data breach 72h**: vedi [data-breach-procedure.md](./data-breach-procedure.md)
- ❌ **DPO**: non designato. Valutare designazione se la base clienti supera [soglia da definire, es. 500] o se si attivano fatturazione e vendite extra-UE
- ❌ **Registro dei trattamenti** (art. 30): da compilare in documento separato
- ❌ **Audit interni periodici**: pianificare cadenza (almeno annuale) post-MVP

---

## 5. Valutazione rischi residui (post-mitigazione)

| # | Rischio iniziale | Mitigazione applicata | Rischio residuo |
|---|---|---|---|
| R1 | Furto dati sanitari | Encryption at-rest + audit log + rate-limit | Basso |
| R2 | IDOR cross-tenant | Multi-tenancy enforced | Basso (richiede ulteriore test penetration) |
| R3 | Token mobile rubato | Refresh token con rotation + SHA256 hash storage | Medio (residuo: assenza cert pinning + biometric → in roadmap H3+H7) |
| R4 | Foto progressi leak | Presigned URL TTL 1h + path strutturato per ownership | Basso |
| R5 | Cancellazione incompleta | Test E2E verificato | Molto basso |
| R6 | Trasferimento Resend US | Nessun PII inviato nelle email, SCC dichiarate Resend | Basso → da abbassare ulteriormente con switch a Postmark EU |
| R7 | Perdita ENCRYPTION_KEY | Backup in password manager personale + Vercel env Sensitive | Medio → ridurre con secondo backup offline cifrato |

---

## 6. Consultazione e revisione

- **DPO consultato**: [non designato / nome se designato]
- **Garante della Privacy consultato preventivamente (art. 36)**: non richiesto al momento (rischi residui non elevati)
- **Prossima revisione**: tra 12 mesi o al verificarsi di una delle seguenti:
  - Aggiunta di un nuovo data processor (es. Stripe per pagamenti)
  - Espansione oltre [soglia X clienti]
  - Cambio della giurisdizione di un processor (es. Neon che sposta region)
  - Data breach significativo (anche se non notificato)

---

## 7. Conclusione

Sulla base dei rischi identificati e delle misure tecniche/organizzative
implementate, il trattamento risulta **conforme ai principi GDPR** e i
rischi residui sono **gestibili**.

I principali gap aperti per il prossimo ciclo di miglioramento:
- Designazione formale DPO (al raggiungimento della soglia)
- Implementazione cert pinning + biometric mobile (H3, H7)
- Migrazione email provider a region EU (G8)
- Drop colonne plain post-encryption coverage 100% (H4 sessione C)

Documento approvato da: __________________
Data: __________________

---

**Riferimenti normativi**:
- Regolamento (UE) 2016/679 (GDPR) — art. 5, 6, 9, 17, 20, 28, 32, 33, 34, 35, 36
- Garante per la protezione dei dati personali — Provvedimento Generale sui dati sanitari (linee guida 2019)

# Procedura Data Breach — Notifica entro 72 ore

**Riferimento normativo**: GDPR art. 33 (notifica al Garante) e art. 34 (notifica agli interessati).
**Titolare**: [da compilare]
**Versione**: 0.1 — bozza
**Ultimo aggiornamento**: 2026-05-17

> Una **violazione dei dati personali** (art. 4(12) GDPR) è qualunque
> incidente che porti, anche **accidentalmente**, a:
> - distruzione, perdita, modifica
> - divulgazione non autorizzata
> - accesso non autorizzato
> a dati personali trasmessi, conservati o trattati.
>
> Esempi reali per questa piattaforma:
> - Furto del laptop del trainer con la sessione attiva del gestionale
> - Database Neon compromesso e dump rubato
> - Bucket Cloudflare R2 reso pubblico per errore
> - Email inviata al cliente sbagliato (chat con dati allenamento)
> - Phishing al trainer → credenziali rubate
> - Bug software che espone dati art.9 ad utenti non autorizzati

---

## 1. Ruoli e contatti

| Ruolo | Persona | Contatti (email/tel) |
|---|---|---|
| **Titolare del trattamento** | [da compilare] | [email] / [tel] |
| **Referente operativo** (chi rileva, contiene, documenta) | [da compilare — può essere il trainer stesso in MVP] | [email] / [tel] |
| **DPO** (se designato) | [non designato in MVP] | — |
| **Legale** (consulente) | [da compilare] | [email] / [tel] |
| **Garante della Privacy** | Autorità nazionale | [protocollo@gpdp.it](mailto:protocollo@gpdp.it) — [garanteprivacy.it/databreach](https://www.garanteprivacy.it/databreach) |

> ⚠️ Aggiornare questa tabella ai cambi di ruolo, prima del prossimo on-call.

---

## 2. Flow operativo (le 5 fasi)

```
[Identificare] → [Contenere] → [Valutare] → [Notificare] → [Documentare/Imparare]
       ↑ T=0                                ↑ T+72h max
```

### 2.1 FASE 1 — IDENTIFICARE (T=0)

Il primo che si accorge dell'incidente:
- ✅ Annota la data/ora **precisa** del rilevamento (timezone Europa/Roma)
- ✅ Annota **come** è stato scoperto (alert automatico, segnalazione utente, audit log anomalo, ecc.)
- ✅ Notifica **immediatamente** il referente operativo (anche di notte/weekend, se sospetto serio)
- ❌ **NON** tenta di "sistemare" prima di documentare lo stato attuale (rischio di distruggere evidenze forensi)

### 2.2 FASE 2 — CONTENERE (entro 4 ore dal rilevamento)

Azioni immediate per **fermare l'emorragia**:

| Scenario | Azione |
|---|---|
| Credenziali compromesse | Reset password trainer + revoca tutti i refresh token mobile (UPDATE `client_refresh_tokens.revoked_at = now()` per cliente impattato) |
| Bug software che espone dati | Disabilita la route incriminata (commit Vercel di rollback al deploy precedente, o feature flag OFF) |
| Database leak | Cambia `DATABASE_URL` (rotazione password Neon), invalida session JWT cambiando `JWT_SECRET` (force-logout di tutti) |
| R2 leak | Rotazione `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` da dashboard Cloudflare |
| ENCRYPTION_KEY compromessa | **Genera nuova key + re-encrypt completo del DB** (richiede script dedicato — pianifica downtime). Vecchia key NON va in dump/log |

### 2.3 FASE 3 — VALUTARE (entro 24 ore)

Domande chiave per decidere se è **notifiabile**:

1. **Quanti interessati**? (1 cliente, 10, tutti?)
2. **Categorie di dati coinvolte**? Includono **art. 9 (salute)**? → se sì, sempre alta gravità
3. **Conseguenze probabili** per gli interessati? (furto identità, ricatto, discriminazione)
4. **Misure di mitigazione già in atto**? (es. i dati erano cifrati at-rest → rischio basso anche se rubati)
5. **Probabilità che il rischio si materializzi**?

Soglia di notifica:
- ✅ **Notifica al Garante (art. 33)**: obbligatoria entro **72h** SE c'è "rischio per i diritti e libertà"
- ✅ **Notifica agli interessati (art. 34)**: obbligatoria SE rischio **elevato** (es. dati salute esposti in chiaro)
- ❌ Se i dati cifrati con AES-256-GCM sono stati rubati MA la chiave è al sicuro → rischio basso → **annota nel registro interno, NON notifica obbligatoria** (ma valuta caso per caso con il legale)

### 2.4 FASE 4 — NOTIFICARE (entro 72 ore dal rilevamento)

#### Notifica al Garante
- Modulo online: [garanteprivacy.it/databreach](https://www.garanteprivacy.it/databreach)
- Contenuto obbligatorio (art. 33(3)):
  - Natura del breach (cos'è successo)
  - Categorie e numero **approssimativo** di interessati e dati interessati
  - Nome e contatti del DPO o referente
  - Conseguenze probabili
  - Misure adottate o proposte per mitigare

> Se non hai tutte le info entro 72h, **notifica comunque** e fornisci aggiornamenti successivi. Il ritardo va motivato.

#### Notifica agli interessati (se applicabile)
- **Canale**: email (usando Resend) + push notification mobile
- **Linguaggio**: chiaro, non tecnico
- **Contenuto** (art. 34(2)):
  - Spiega cosa è successo, senza minimizzare
  - Quali dati sono coinvolti
  - Conseguenze possibili
  - Misure consigliate (es. cambia password, monitora estratti conto se incluso pagamento)
  - Contatti per domande

Template comunicazione utente:

```
Oggetto: Comunicazione importante sui tuoi dati personali

Gentile [Nome],

ti scriviamo per informarti che il [data] abbiamo rilevato un incidente
di sicurezza che potrebbe aver coinvolto alcuni dei tuoi dati personali
gestiti dalla nostra piattaforma.

Cosa è successo:
[descrizione breve e neutra]

Quali dati sono coinvolti:
[elenco specifico]

Cosa abbiamo fatto:
[misure di contenimento]

Cosa puoi fare tu:
- [azione 1, es. cambiare password]
- [azione 2, es. controllare i tuoi accessi recenti]

Per qualsiasi domanda, scrivici a [email] o telefona a [tel].

Cordiali saluti,
[Titolare]
```

### 2.5 FASE 5 — DOCUMENTARE E IMPARARE (entro 7 giorni)

- Compila il **registro interno data breach** (art. 33(5)) con:
  - Cronologia dettagliata
  - Categorie e numero di soggetti
  - Conseguenze
  - Provvedimenti adottati
- Fai una **retrospettiva tecnica** post-mortem:
  - Causa root
  - Cosa ha funzionato del rilevamento
  - Cosa è mancato (monitoraggio, alerting, runbook)
- Aggiorna il **piano di sicurezza** se l'incident ha rivelato gap

---

## 3. Strumenti tecnici disponibili

| Strumento | Per cosa | Dove |
|---|---|---|
| `audit_logs` table | Tracciare accessi a dati art.9 | DB Neon, query da [pannello admin / SQL diretto] |
| `[scripts/test-gdpr-erasure.ts](../../scripts/test-gdpr-erasure.ts)` | Verificare integrità del flow di cancellazione | Da rilanciare dopo ogni migrazione DB |
| Vercel logs | Errori 5xx, request anomale | Vercel Dashboard → Deployments → Logs |
| Neon Insights | CPU/connections spike, query lente | Neon Dashboard |
| Upstash analytics | Rate-limit triggered (possibile bruteforce in corso) | Upstash Dashboard |

---

## 4. Test della procedura

Almeno **una volta l'anno** simula un breach (tabletop exercise):
1. Scenario fittizio (es. "credenziali trainer rubate, presunto accesso non autorizzato a 3 clienti")
2. Esegui la procedura come fosse reale (no notifiche vere)
3. Cronometra T=0 → notifica completata
4. Identifica colli di bottiglia e aggiorna questo documento

Prossimo test programmato: **[da pianificare]**

---

## 5. Allegati

- [DPIA](./dpia.md) — Valutazione d'impatto
- [Registro interno data breach](./breach-log.md) — [da creare al primo incidente, anche fittizio per test]
- Contatto Garante per la Privacy: [garanteprivacy.it](https://www.garanteprivacy.it)

---

**Approvazione**:
Firma titolare: __________________
Data: __________________

import { db } from "@/db";
import { settings, trainers } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Informativa Privacy ai sensi del Reg. UE 2016/679 (GDPR).
 *
 * ⚠️  TESTO TEMPLATE: questa pagina contiene un'informativa standard
 * generata come placeholder. PRIMA DI ANDARE IN PRODUZIONE deve essere
 * revisionata e personalizzata da un consulente legale / DPO con i dati
 * reali del Titolare del trattamento (ragione sociale, P.IVA, sede,
 * indirizzo e-mail, riferimenti DPO se nominato, accordi DPA con i
 * fornitori, periodi di conservazione esatti, eventuali trasferimenti
 * extra-UE).
 */
export default async function PrivacyPolicyPage() {
    let siteName = "Ernesto Performance";
    let trainerEmail = "";
    try {
        const [row] = await db.select().from(settings).limit(1);
        if (row) siteName = row.site_name ?? siteName;
        const [t] = await db
            .select({ email: trainers.email })
            .from(trainers)
            .orderBy(sql`id asc`)
            .limit(1);
        if (t) trainerEmail = t.email;
    } catch {
        // ignore
    }

    const updated = "Maggio 2026";

    return (
        <article className="prose prose-slate max-w-none">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Informativa sulla Privacy
            </h1>
            <p className="text-sm text-slate-500 mb-8">
                Ultimo aggiornamento: {updated}
            </p>

            <section className="mb-8">
                <p>
                    La presente informativa descrive le modalità di trattamento
                    dei dati personali degli utenti della piattaforma{" "}
                    <strong>{siteName}</strong> (di seguito anche
                    &ldquo;Piattaforma&rdquo;), erogata tramite app mobile e
                    dashboard web. Il trattamento è effettuato in conformità al
                    Regolamento UE 2016/679 (GDPR) e al D.lgs. 196/2003 come
                    modificato dal D.lgs. 101/2018.
                </p>
            </section>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                1. Titolare del trattamento
            </h2>
            <p>
                Il Titolare del trattamento è il professionista personal trainer
                che gestisce il presente account {siteName}
                {trainerEmail ? ` (contatto: ${trainerEmail})` : ""}.
            </p>
            <p className="text-sm text-slate-500 italic">
                [Inserire ragione sociale, P.IVA, sede legale, indirizzo PEC]
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                2. Dati personali trattati
            </h2>
            <ul>
                <li>
                    <strong>Dati identificativi e di contatto</strong>: nome,
                    cognome, email, telefono, data di nascita.
                </li>
                <li>
                    <strong>Dati relativi all&apos;allenamento</strong>: schede,
                    log esercizi, carichi, ripetizioni, note.
                </li>
                <li>
                    <strong>Dati di stato di salute (art. 9 GDPR)</strong>:
                    misurazioni corporee (peso, BIA, circonferenze), foto di
                    progresso, risposte ai questionari di salute, anamnesi,
                    eventuali patologie, allergie, intolleranze, farmaci.
                </li>
                <li>
                    <strong>Dati nutrizionali</strong>: piani alimentari,
                    preferenze, restrizioni.
                </li>
                <li>
                    <strong>Dati di pagamento / abbonamento</strong>: tipologia
                    di pacchetto, date di inizio/fine, importi (NB: i pagamenti
                    non transitano attraverso la Piattaforma).
                </li>
                <li>
                    <strong>Dati tecnici</strong>: token di sessione (JWT), id
                    device per notifiche push, indirizzo IP nei log applicativi
                    per finalità di sicurezza.
                </li>
                <li>
                    <strong>Comunicazioni</strong>: messaggi inviati tramite la
                    chat con il trainer, allegati condivisi, documenti caricati
                    (es. certificato medico, consenso informato).
                </li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                3. Finalità e base giuridica
            </h2>
            <ul>
                <li>
                    <strong>
                        Erogazione del servizio di personal training
                    </strong>{" "}
                    (gestione scheda, monitoraggio progressi, comunicazioni con
                    il trainer) &mdash; base giuridica: esecuzione di un
                    contratto (art. 6.1.b GDPR).
                </li>
                <li>
                    <strong>
                        Trattamento dei dati relativi alla salute
                    </strong>{" "}
                    (peso, misurazioni, anamnesi, patologie, allergie) &mdash;
                    base giuridica: consenso esplicito dell&apos;interessato
                    (art. 9.2.a GDPR). Il consenso può essere revocato in
                    qualsiasi momento.
                </li>
                <li>
                    <strong>Adempimenti contabili e fiscali</strong> &mdash;
                    base giuridica: obbligo di legge (art. 6.1.c GDPR).
                </li>
                <li>
                    <strong>Sicurezza della piattaforma</strong> (log di accesso,
                    rate limiting, prevenzione frodi) &mdash; base giuridica:
                    legittimo interesse del Titolare (art. 6.1.f GDPR).
                </li>
                <li>
                    <strong>Comunicazioni commerciali</strong> (annunci di nuovi
                    pacchetti / offerte) &mdash; base giuridica: consenso
                    facoltativo dell&apos;interessato.
                </li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                4. Modalità del trattamento
            </h2>
            <p>
                I dati sono trattati con strumenti elettronici, conservati su
                server gestiti da fornitori che hanno aderito a standard di
                sicurezza adeguati (vedi sezione 6). Sono adottate misure
                tecniche e organizzative idonee a garantire riservatezza,
                integrità e disponibilità (cifratura in transito, hashing delle
                password, controllo degli accessi, log di audit).
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                5. Periodo di conservazione
            </h2>
            <ul>
                <li>
                    Dati relativi al rapporto contrattuale: 10 anni dalla
                    cessazione del rapporto (obblighi fiscali).
                </li>
                <li>
                    Dati di salute, schede e progressi: per la durata del
                    rapporto e per ulteriori 24 mesi, salvo richiesta di
                    cancellazione anticipata.
                </li>
                <li>
                    Log applicativi e di sicurezza: 12 mesi.
                </li>
                <li>
                    Comunicazioni di marketing: fino a revoca del consenso.
                </li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                6. Destinatari e fornitori (Responsabili del trattamento)
            </h2>
            <p>
                Per l&apos;erogazione del servizio ci avvaliamo dei seguenti
                fornitori, designati Responsabili del trattamento ex art. 28
                GDPR:
            </p>
            <ul>
                <li>
                    <strong>Vercel Inc.</strong> &mdash; hosting applicativo.
                </li>
                <li>
                    <strong>Neon Inc.</strong> &mdash; database PostgreSQL
                    gestito.
                </li>
                <li>
                    <strong>Cloudflare Inc.</strong> &mdash; storage R2 di
                    documenti, foto e allegati.
                </li>
                <li>
                    <strong>Resend Inc.</strong> &mdash; invio email
                    transazionali.
                </li>
                <li>
                    <strong>Google Firebase / Apple Push</strong> &mdash; invio
                    notifiche push (solo token device, no contenuto sensibile).
                </li>
                <li>
                    <strong>Upstash Inc.</strong> &mdash; rate limiting Redis.
                </li>
            </ul>
            <p className="text-sm text-slate-500 italic">
                [Verificare i DPA effettivamente firmati e l&apos;eventuale
                trasferimento extra-SEE con relative SCCs.]
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                7. Trasferimento extra-UE
            </h2>
            <p>
                Alcuni fornitori potrebbero trasferire dati al di fuori dello
                Spazio Economico Europeo. In tal caso il trasferimento avviene
                sulla base di Clausole Contrattuali Standard (SCCs) approvate
                dalla Commissione Europea, integrate da misure supplementari
                quando necessarie.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                8. Diritti dell&apos;interessato
            </h2>
            <p>
                In qualità di interessato puoi esercitare in qualsiasi momento i
                seguenti diritti (artt. 15-22 GDPR):
            </p>
            <ul>
                <li>diritto di accesso ai dati che ti riguardano;</li>
                <li>diritto di rettifica;</li>
                <li>
                    diritto alla cancellazione (&laquo;diritto
                    all&apos;oblio&raquo;);
                </li>
                <li>diritto di limitazione del trattamento;</li>
                <li>diritto alla portabilità dei dati;</li>
                <li>diritto di opposizione;</li>
                <li>diritto a revocare il consenso.</li>
            </ul>
            <p>
                Puoi esercitare i diritti direttamente dall&apos;app mobile (
                <em>Altro &rarr; Privacy e dati</em>) usando le funzioni
                &laquo;Scarica i miei dati&raquo; e &laquo;Elimina il mio
                account&raquo;, oppure scrivendo al Titolare ai recapiti
                indicati in sezione 1.
            </p>
            <p>
                Hai inoltre diritto di proporre reclamo al{" "}
                <strong>Garante per la protezione dei dati personali</strong> (
                <a
                    href="https://www.garanteprivacy.it"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                >
                    www.garanteprivacy.it
                </a>
                ).
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                9. Conferimento dei dati
            </h2>
            <p>
                Il conferimento dei dati identificativi e dei dati di salute è
                necessario per erogare il servizio: il mancato conferimento
                rende impossibile la prestazione. I dati per finalità di
                marketing sono invece facoltativi.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                10. Modifiche all&apos;informativa
            </h2>
            <p>
                Il Titolare si riserva di aggiornare la presente informativa.
                Sarà cura del Titolare informare gli utenti tramite app o email
                in caso di modifiche sostanziali.
            </p>
        </article>
    );
}

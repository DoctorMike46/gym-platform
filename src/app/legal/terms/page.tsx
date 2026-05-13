import { db } from "@/db";
import { settings } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * Termini di Servizio della piattaforma.
 *
 * ⚠️  TESTO TEMPLATE: revisione legale OBBLIGATORIA prima della messa in
 * produzione. Le clausole sono indicative e devono essere adattate
 * all'effettiva attività commerciale del trainer (qualifica professionale,
 * eventuale iscrizione albo / ordine, copertura assicurativa, foro
 * competente, condizioni di rinnovo, recesso, ecc.).
 */
export default async function TermsPage() {
    let siteName = "Ernesto Performance";
    try {
        const [row] = await db.select().from(settings).limit(1);
        if (row) siteName = row.site_name ?? siteName;
    } catch {
        // ignore
    }

    const updated = "Maggio 2026";

    return (
        <article className="prose prose-slate max-w-none">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Termini e Condizioni di Servizio
            </h1>
            <p className="text-sm text-slate-500 mb-8">
                Ultimo aggiornamento: {updated}
            </p>

            <section className="mb-8">
                <p>
                    I presenti Termini e Condizioni (di seguito
                    &laquo;Termini&raquo;) regolano l&apos;accesso e
                    l&apos;utilizzo della piattaforma{" "}
                    <strong>{siteName}</strong> (di seguito anche
                    &laquo;Piattaforma&raquo;), erogata tramite app mobile e
                    dashboard web. Utilizzando la Piattaforma l&apos;utente
                    accetta integralmente i presenti Termini.
                </p>
            </section>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                1. Definizioni
            </h2>
            <ul>
                <li>
                    <strong>Trainer</strong>: il professionista del settore
                    fitness titolare dell&apos;account che eroga il servizio di
                    personal training.
                </li>
                <li>
                    <strong>Cliente</strong>: l&apos;utente persona fisica che
                    riceve dal Trainer un invito di attivazione account.
                </li>
                <li>
                    <strong>Servizio</strong>: l&apos;insieme di funzionalità
                    della Piattaforma, inclusi schede, log allenamento, piani
                    alimentari, chat, prenotazioni, questionari, documenti.
                </li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                2. Natura del servizio
            </h2>
            <p>
                Il Servizio costituisce uno strumento di supporto al rapporto
                professionale fra Trainer e Cliente. Le indicazioni,
                schede e suggerimenti forniti tramite la Piattaforma{" "}
                <strong>
                    non costituiscono prescrizione medica né sostituiscono il
                    parere di figure sanitarie abilitate
                </strong>
                . Prima di intraprendere qualsiasi programma di allenamento o
                regime alimentare il Cliente è tenuto a consultare un medico
                e/o un professionista sanitario qualificato.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                3. Account e accesso
            </h2>
            <p>
                L&apos;account Cliente viene creato dal Trainer e attivato
                dal Cliente attraverso un link di invito ricevuto via email.
                Il Cliente è tenuto a custodire le proprie credenziali con la
                massima diligenza e a non condividerle con terzi. Ogni
                attività svolta tramite l&apos;account si presume effettuata
                dal Cliente.
            </p>
            <p>
                Per attivare l&apos;account il Cliente deve avere almeno 18
                anni. In caso di minori, l&apos;accesso deve essere autorizzato
                e gestito da chi esercita la responsabilità genitoriale.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                4. Obblighi del Cliente
            </h2>
            <ul>
                <li>
                    Fornire informazioni veritiere, complete e aggiornate
                    relativamente al proprio stato di salute, anamnesi,
                    patologie, allergie, intolleranze e farmaci assunti.
                </li>
                <li>
                    Comunicare tempestivamente al Trainer qualsiasi variazione
                    del proprio stato di salute o l&apos;insorgenza di
                    sintomi durante gli allenamenti.
                </li>
                <li>
                    Non utilizzare la Piattaforma per finalità illecite o in
                    violazione di diritti di terzi.
                </li>
                <li>
                    Non caricare contenuti che violino diritti di proprietà
                    intellettuale, dati personali di terzi o materiali
                    illegali.
                </li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                5. Abbonamenti e pagamenti
            </h2>
            <p>
                I pacchetti e gli abbonamenti vengono assegnati dal Trainer al
                Cliente nell&apos;ambito di un rapporto professionale separato.
                I pagamenti{" "}
                <strong>non avvengono attraverso la Piattaforma</strong> ma
                direttamente fra Cliente e Trainer secondo le modalità
                concordate. L&apos;eventuale emissione di fatture o ricevute è
                a cura del Trainer.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                6. Diritto di recesso e cancellazione
            </h2>
            <p>
                Il Cliente può in qualsiasi momento richiedere la
                cancellazione del proprio account direttamente dall&apos;app
                (
                <em>Altro &rarr; Privacy e dati &rarr; Elimina il mio account</em>
                ). Eventuali condizioni di rimborso degli abbonamenti già
                pagati sono regolate direttamente fra Cliente e Trainer.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                7. Proprietà intellettuale
            </h2>
            <p>
                Tutti i contenuti della Piattaforma (schede, testi, grafica,
                marchi) sono di proprietà del Trainer o dei rispettivi
                titolari e sono protetti dalle norme sul diritto d&apos;autore
                e sui marchi. È vietata la riproduzione o ridistribuzione
                anche parziale senza autorizzazione scritta.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                8. Limitazione di responsabilità
            </h2>
            <p>
                Nei limiti consentiti dalla legge, il Trainer non risponde di
                danni indiretti o consequenziali derivanti dall&apos;uso della
                Piattaforma, ivi inclusi danni connessi a interruzioni del
                servizio, perdita di dati o malfunzionamenti dei fornitori
                tecnologici terzi.
            </p>
            <p className="text-sm text-slate-500 italic">
                [Verificare con consulente legale i limiti effettivamente
                applicabili e la copertura assicurativa di responsabilità
                civile professionale.]
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                9. Modifiche
            </h2>
            <p>
                Il Trainer si riserva il diritto di modificare i presenti
                Termini in qualsiasi momento. Le modifiche saranno comunicate
                in app o via email; il proseguimento dell&apos;utilizzo del
                Servizio dopo la comunicazione costituisce accettazione delle
                nuove condizioni.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">
                10. Legge applicabile e foro competente
            </h2>
            <p>
                I presenti Termini sono regolati dalla legge italiana. Per
                qualsiasi controversia è competente in via esclusiva il foro
                del consumatore ove il Cliente abbia la propria residenza o
                domicilio, in conformità all&apos;art. 66-bis del Codice del
                Consumo.
            </p>
        </article>
    );
}

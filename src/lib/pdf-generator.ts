export const generateWorkoutPDF = async (
    template: any,
    trainerSettings: any,
    clientData?: { nome: string; cognome: string; dataAssegnazione: string }
) => {
    // Inizializza i font dinamicamente per evitare errori di SSR/Next.js
    const pdfMake = require("pdfmake/build/pdfmake");
    const pdfFonts = require("pdfmake/build/vfs_fonts");

    const vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs || pdfFonts.default?.pdfMake?.vfs || pdfFonts.default?.vfs;
    pdfMake.vfs = vfs;

    // Organizziamo gli esercizi per giorno
    const daysMap = new Map<number, any[]>();
    if (template.exercises && Array.isArray(template.exercises)) {
        template.exercises.forEach((ex: any) => {
            if (!daysMap.has(ex.giorno)) {
                daysMap.set(ex.giorno, []);
            }
            daysMap.get(ex.giorno)?.push(ex);
        });
    }

    // Costruiamo il contenuto array del PDF
    const content: any[] = [];

    // Header / Logo
    if (trainerSettings?.logo_url) {
        // Qui ci assicuriamo di usare path assoluti per il client o caricare in Base64
        // ma pdfmake in browser accetta URL direct se non cross-origin.
        // Convert local path /uploads/x to window.location.origin
        const fullLogoUrl = window.location.origin + trainerSettings.logo_url;
        content.push({
            image: await fetchImageAsBase64(fullLogoUrl) || "", // Fallback gestito dopo
            width: 120,
            alignment: 'center',
            margin: [0, 0, 0, 20]
        });
    } else {
        content.push({
            text: trainerSettings?.site_name || "Ernesto Performance",
            style: 'headerLogo',
            alignment: 'center',
            margin: [0, 0, 0, 20]
        });
    }

    // Titolo Scheda
    content.push({
        text: template.nome_template,
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 5]
    });

    // Info Cliente (Optional)
    if (clientData) {
        content.push({
            text: `Cliente: ${clientData.nome} ${clientData.cognome}`,
            style: 'clientInfo',
            alignment: 'center',
            margin: [0, 5, 0, 2]
        });
        content.push({
            text: `Assegnata il: ${clientData.dataAssegnazione}`,
            style: 'clientSubInfo',
            alignment: 'center',
            margin: [0, 0, 0, 5]
        });
    }

    // Split Info
    content.push({
        text: `${template.split_settimanale} Sessioni a Settimana`,
        style: 'subheader',
        alignment: 'center',
        margin: [0, 5, 0, 20]
    });

    // Progressioni (se presenti)
    if (template.note_progressione) {
        content.push({
            text: 'Regole di Progressione:',
            style: 'sectionTitle',
            margin: [0, 10, 0, 5]
        });
        content.push({
            text: template.note_progressione,
            style: 'normalText',
            margin: [0, 0, 0, 20]
        });
    }

    // Generazione Tabelle Giornaliere
    Array.from(daysMap.entries()).sort(([a], [b]) => a - b).forEach(([dayNum, dayExs]) => {

        content.push({
            text: `GIORNO ${dayNum}`,
            style: 'dayTitle',
            margin: [0, 20, 0, 10]
        });

        // Tabella
        const tableBody = [
            // Header row
            [
                { text: 'Esercizio', style: 'tableHeader' },
                { text: 'Serie', style: 'tableHeader' },
                { text: 'Ripetizioni', style: 'tableHeader' },
                { text: 'Recupero', style: 'tableHeader' },
                { text: 'RPE/Buffer', style: 'tableHeader' },
                { text: 'Note', style: 'tableHeader' }
            ]
        ];

        // Sort by ordine
        dayExs.sort((a, b) => a.ordine - b.ordine).forEach((ex, idx) => {
            const exName = ex.exercise?.nome || ex.nome || "Esercizio rimosso";
            tableBody.push([
                { text: `${idx + 1}. ${exName}`, style: 'tableCellBold' },
                { text: ex.serie || '-', style: 'tableCell' },
                { text: ex.ripetizioni || '-', style: 'tableCell' },
                { text: ex.recupero || '-', style: 'tableCell' },
                { text: ex.rpe || '-', style: 'tableCell' },
                { text: ex.note_tecniche || '-', style: 'tableCellSmall' },
            ]);
        });

        content.push({
            table: {
                headerRows: 1,
                widths: ['*', '10%', '15%', '15%', '12%', '25%'],
                body: tableBody
            },
            layout: 'lightHorizontalLines'
        });
    });

    // Disclaimer / Nota importante fine pagina
    const workoutFooterText = trainerSettings?.pdf_workouts_footer || "Scheda per finalità di fitness/performance/benessere generale. Non sostituisce parere medico e non è un\ntrattamento sanitario. In presenza di patologie, dolore importante o sintomi anomali, interrompere l’attività\ne consultare un professionista sanitario.";
    content.push({
        text: [
            { text: "Nota importante\n", bold: true },
            workoutFooterText
        ],
        style: 'footer',
        alignment: 'center' as const,
        margin: [0, 40, 0, 0] as [number, number, number, number]
    });

    const docDefinition = {
        content: content,
        styles: {
            headerLogo: { fontSize: 22, bold: true, color: trainerSettings?.primary_color || '#003366' },
            header: { fontSize: 24, bold: true, color: '#1e293b' },
            clientInfo: { fontSize: 16, bold: true, color: trainerSettings?.primary_color || '#003366' },
            clientSubInfo: { fontSize: 12, italics: true, color: '#64748b' },
            subheader: { fontSize: 14, color: '#64748b' },
            sectionTitle: { fontSize: 14, bold: true, color: '#334155' },
            dayTitle: { fontSize: 18, bold: true, color: trainerSettings?.primary_color || '#003366' },
            normalText: { fontSize: 11, color: '#475569', leadingIndent: 10 },
            tableHeader: { bold: true, fontSize: 11, color: 'white', fillColor: trainerSettings?.primary_color || '#003366', alignment: 'center' as const },
            tableCell: { fontSize: 10, alignment: 'center' as const, margin: [0, 5, 0, 5] as [number, number, number, number] },
            tableCellBold: { fontSize: 11, bold: true, margin: [0, 5, 0, 5] as [number, number, number, number] },
            tableCellSmall: { fontSize: 9, italics: true, color: '#64748b', margin: [0, 5, 0, 5] as [number, number, number, number] },
            footer: { fontSize: 9, color: '#64748b' }
        },
        defaultStyle: {
            font: 'Roboto'
        }
    };

    // Apri download
    pdfMake.createPdf(docDefinition).download(`${template.nome_template.replace(/\s+/g, "_")}.pdf`);
};

export const generateServicesPDF = async (
    servicesData: any[],
    trainerSettings: any
) => {
    const pdfMake = require("pdfmake/build/pdfmake");
    const pdfFonts = require("pdfmake/build/vfs_fonts");

    const vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs || pdfFonts.default?.pdfMake?.vfs || pdfFonts.default?.vfs;
    pdfMake.vfs = vfs;

    const content: any[] = [];

    // Header / Logo
    if (trainerSettings?.logo_url) {
        const fullLogoUrl = window.location.origin + trainerSettings.logo_url;
        content.push({
            image: await fetchImageAsBase64(fullLogoUrl) || "",
            width: 120,
            alignment: 'center',
            margin: [0, 0, 0, 20]
        });
    } else {
        content.push({
            text: trainerSettings?.site_name || "Ernesto Performance",
            style: 'headerLogo',
            alignment: 'center',
            margin: [0, 0, 0, 20]
        });
    }

    // Super Header (dynamic)
    const introTitle = trainerSettings?.pdf_services_intro_title || "Personal Training • Postura • Performance • Bodybuilding";
    content.push({
        text: introTitle,
        style: 'superHeader',
        alignment: 'center',
        margin: [0, 0, 0, 10]
    });

    content.push({
        text: "Info e costi",
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 10]
    });

    // Introduzione testuale (dynamic)
    const introText = trainerSettings?.pdf_services_intro_text || "Scegli subito il percorso più adatto alle tue esigenze.";
    content.push({
        text: introText,
        style: 'introText',
        alignment: 'center',
        margin: [20, 0, 20, 30]
    });

    // Tabella "Come scegliere"
    content.push({
        text: "Come scegliere in 20 secondi",
        style: 'sectionHeading',
        margin: [0, 0, 0, 10],
        alignment: 'center'
    });

    content.push({
        table: {
            headerRows: 1,
            widths: ['*', '*'],
            body: [
                [
                    { text: 'Se vuoi…', style: 'tableHeaderLeft' },
                    { text: 'Scegli…', style: 'tableHeaderRight' }
                ],
                [
                    { text: 'Un programma da seguire in autonomia', style: 'tableCellLeft' },
                    { text: 'Scheda Personalizzata', style: 'tableCellRightBold' }
                ],
                [
                    { text: 'Essere seguito mese per mese con aggiornamenti', style: 'tableCellLeftAlt' },
                    { text: 'Coaching Online 1:1', style: 'tableCellRightBoldAlt' }
                ],
                [
                    { text: 'Migliorare tecnica e sicurezza dal vivo', style: 'tableCellLeft' },
                    { text: 'Lezione PT in palestra (a seduta o pacchetto)', style: 'tableCellRightBold' }
                ]
            ]
        },
        layout: 'noBorders', // Nascondiamo i bordi per un look più "clean"
        margin: [0, 10, 0, 40]
    });

    // Lista servizi piatta (ordinata per prezzo crescente dalla query)
    servicesData.forEach((service: any, index: number) => {
        const serviceBlock: any[] = [
            {
                columns: [
                    { text: service.nome_servizio, style: 'serviceName', width: '*' },
                    { text: `€${(service.prezzo / 100).toFixed(2)}`, style: 'servicePrice', width: 'auto' }
                ],
                margin: [0, 0, 0, 5]
            }
        ];

        // Badges testuali
        const infoLine = [];
        if (service.durata_settimane) infoLine.push(`Durata: ${service.durata_settimane} Settimane`);
        if (service.include_coaching) infoLine.push("Include Affiancamento (Coaching)");

        if (infoLine.length > 0) {
            serviceBlock.push({
                text: infoLine.join('  •  '),
                style: 'serviceInfo',
                margin: [0, 0, 0, 5]
            });
        }

        // Descrizione breve
        if (service.descrizione_breve) {
            serviceBlock.push({
                text: service.descrizione_breve,
                style: 'serviceDesc',
                margin: [0, 0, 0, 5]
            });
        }

        // Caratteristiche Bullet list
        if (service.caratteristiche) {
            const featureLines = service.caratteristiche.split('\n').filter((feat: string) => feat.trim());
            if (featureLines.length > 0) {
                serviceBlock.push({
                    ul: featureLines.map((feat: string) => ({ text: feat.trim(), style: 'bulletPoint' })),
                    margin: [10, 5, 0, 10]
                });
            }
        }

        content.push({
            stack: serviceBlock,
            margin: [0, index === 0 ? 10 : 0, 0, 20]
        });
    });

    // --- Sezione Regole Chiare (dynamic) ---
    const rulesText = trainerSettings?.pdf_services_rules;
    if (rulesText) {
        content.push({
            text: 'Regole chiare',
            style: 'sectionHeading',
            margin: [0, 30, 0, 10]
        });
        const ruleLines = rulesText.split('\n').filter((l: string) => l.trim());
        content.push({
            ul: ruleLines.map((line: string) => ({ text: line.trim(), style: 'ruleItem' })),
            margin: [10, 0, 0, 20]
        });
    } else {
        content.push({
            text: 'Regole chiare',
            style: 'sectionHeading',
            margin: [0, 30, 0, 10]
        });
        content.push({
            ul: [
                { text: [{ text: 'Tempi risposta: ', bold: true }, 'entro 24–48h (lun–ven).'], style: 'ruleItem' },
                { text: [{ text: 'Sicurezza e Salute: ', bold: true }, 'in caso di dolore insolito, si scala l\'intensità e, se necessario, si rimanda l\'atleta al medico o fisioterapista.'], style: 'ruleItem' }
            ],
            margin: [10, 0, 0, 20]
        });
    }

    // --- Sezione Come si parte (dynamic) ---
    const startText = trainerSettings?.pdf_services_start;
    if (startText) {
        content.push({
            text: 'Come si parte',
            style: 'sectionHeading',
            margin: [0, 10, 0, 10]
        });
        const startLines = startText.split('\n').filter((l: string) => l.trim());
        content.push({
            ol: startLines.map((line: string) => ({ text: line.trim(), style: 'ruleItem' })),
            margin: [10, 0, 0, 30]
        });
    } else {
        content.push({
            text: 'Come si parte',
            style: 'sectionHeading',
            margin: [0, 10, 0, 10]
        });
        content.push({
            ol: [
                { text: [{ text: 'Compila consenso e anamnesi: ', bold: true }, 'firma il consenso informato e compila l\'anamnesi con i tuoi dati di base, obiettivi e storico clinico.'], style: 'ruleItem' },
                { text: [{ text: 'Scegli pacchetti: ', bold: true }, 'individuiamo insieme il pacchetto più adatto alle tue esigenze e frequenza di allenamento.'], style: 'ruleItem' },
                { text: [{ text: 'Pagamento: ', bold: true }, 'conferma il pacchetto scelto tramite la modalità di pagamento concordata.'], style: 'ruleItem' },
                { text: [{ text: 'Avvio programma: ', bold: true }, 'ricevi la scheda di allenamento strutturata e tutte le istruzioni dettagliate.'], style: 'ruleItem' },
                { text: [{ text: 'Inizio coaching: ', bold: true }, 'partiamo con il tracking dei progressi e gli aggiornamenti al programma quando necessario.'], style: 'ruleItem' }
            ],
            margin: [10, 0, 0, 30]
        });
    }

    // Disclaimer finale
    content.push({
        text: 'Documento ad uso personale del cliente. Vietata la diffusione senza autorizzazione. Le indicazioni non sostituiscono parere medico.',
        style: 'disclaimer',
        alignment: 'center',
        margin: [20, 40, 20, 0]
    });

    const docDefinition = {
        content: content,
        styles: {
            headerLogo: { fontSize: 24, bold: true, color: trainerSettings?.primary_color || '#003366' },
            superHeader: { fontSize: 12, bold: true, color: '#64748b', tracking: 1 },
            header: { fontSize: 28, bold: true, color: trainerSettings?.primary_color || '#003366' },
            introText: { fontSize: 11, color: '#475569', italics: true },
            categoryTitle: { fontSize: 16, bold: true, color: trainerSettings?.primary_color || '#003366', decoration: 'underline' },
            serviceName: { fontSize: 14, bold: true, color: '#334155' },
            servicePrice: { fontSize: 14, bold: true, color: '#000000' },
            serviceInfo: { fontSize: 10, bold: true, color: trainerSettings?.primary_color || '#003366', italics: true },
            serviceDesc: { fontSize: 11, color: '#475569' },
            bulletPoint: { fontSize: 11, color: '#475569', margin: [0, 2, 0, 2] as [number, number, number, number] },
            sectionHeading: { fontSize: 16, bold: true, color: trainerSettings?.primary_color || '#003366', decoration: 'underline' },
            ruleItem: { fontSize: 11, color: '#475569', margin: [0, 3, 0, 3] as [number, number, number, number] },
            disclaimer: { fontSize: 9, italics: true, color: '#94a3b8' },

            // Stili per la tabella "Come scegliere"
            tableHeaderLeft: { bold: true, fontSize: 12, color: 'white', fillColor: trainerSettings?.primary_color || '#003366', alignment: 'center' as const, margin: [0, 8, 0, 8] as [number, number, number, number] },
            tableHeaderRight: { bold: true, fontSize: 12, color: 'white', fillColor: trainerSettings?.primary_color || '#003366', alignment: 'center' as const, margin: [0, 8, 0, 8] as [number, number, number, number] },
            tableCellLeft: { fontSize: 11, color: '#334155', margin: [10, 8, 10, 8] as [number, number, number, number] },
            tableCellRightBold: { fontSize: 11, bold: true, color: trainerSettings?.primary_color || '#003366', margin: [10, 8, 10, 8] as [number, number, number, number] },
            tableCellLeftAlt: { fontSize: 11, color: '#334155', fillColor: '#f8fafc', margin: [10, 8, 10, 8] as [number, number, number, number] },
            tableCellRightBoldAlt: { fontSize: 11, bold: true, color: trainerSettings?.primary_color || '#003366', fillColor: '#f8fafc', margin: [10, 8, 10, 8] as [number, number, number, number] }
        },
        defaultStyle: {
            font: 'Roboto'
        }
    };

    pdfMake.createPdf(docDefinition).download(`Listino_Servizi.pdf`);
};

// Helper per convertire immagini in Base64 (Richiesto da pdfMake se da web)
async function fetchImageAsBase64(url: string) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Failed to fetch image for PDF:", e);
        return null; // Ritorneremo testo fallback se fallisce
    }
}

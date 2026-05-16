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

    const primaryColor = trainerSettings?.primary_color || '#003366';
    const siteName = trainerSettings?.site_name || "Ernesto Performance";

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

    // ── Header: logo (sx) + titolo scheda (centro) ──────────────────
    let logoBase64: string | null = null;
    if (trainerSettings?.logo_url) {
        const fullLogoUrl = window.location.origin + trainerSettings.logo_url;
        logoBase64 = await fetchImageAsBase64(fullLogoUrl);
    }

    content.push({
        columns: [
            logoBase64
                ? { image: logoBase64, width: 70, alignment: 'left' as const }
                : { text: siteName, style: 'headerLogo', alignment: 'left' as const },
            {
                stack: [
                    { text: template.nome_template, style: 'header', alignment: 'right' as const },
                    {
                        text: `${template.split_settimanale} sessioni a settimana`,
                        style: 'subheader',
                        alignment: 'right' as const,
                        margin: [0, 2, 0, 0] as [number, number, number, number],
                    },
                ],
            },
        ],
        margin: [0, 0, 0, 10] as [number, number, number, number],
    });

    // Linea separatrice colorata
    content.push({
        canvas: [
            {
                type: 'line',
                x1: 0,
                y1: 0,
                x2: 515,
                y2: 0,
                lineWidth: 2,
                lineColor: primaryColor,
            },
        ],
        margin: [0, 5, 0, 15] as [number, number, number, number],
    });

    // ── Box info cliente (se presente) ──────────────────────────────
    if (clientData) {
        content.push({
            table: {
                widths: ['*'],
                body: [[
                    {
                        stack: [
                            {
                                columns: [
                                    {
                                        text: 'CLIENTE',
                                        style: 'boxLabel',
                                        width: 60,
                                    },
                                    {
                                        text: `${clientData.nome} ${clientData.cognome}`,
                                        style: 'boxValue',
                                        width: '*',
                                    },
                                ],
                            },
                            {
                                columns: [
                                    {
                                        text: 'ASSEGNATA',
                                        style: 'boxLabel',
                                        width: 60,
                                    },
                                    {
                                        text: clientData.dataAssegnazione,
                                        style: 'boxValue',
                                        width: '*',
                                    },
                                ],
                                margin: [0, 3, 0, 0] as [number, number, number, number],
                            },
                        ],
                        margin: [10, 8, 10, 8] as [number, number, number, number],
                    },
                ]],
            },
            layout: {
                fillColor: () => '#f8fafc',
                hLineWidth: () => 0,
                vLineWidth: () => 0,
            },
            margin: [0, 0, 0, 15] as [number, number, number, number],
        });
    }

    // ── Note di progressione ────────────────────────────────────────
    if (template.note_progressione) {
        content.push({
            text: 'REGOLE DI PROGRESSIONE',
            style: 'sectionTitle',
            margin: [0, 5, 0, 5] as [number, number, number, number],
        });
        content.push({
            text: template.note_progressione,
            style: 'normalText',
            margin: [0, 0, 0, 15] as [number, number, number, number],
        });
    }

    // ── Tabelle giornaliere ─────────────────────────────────────────
    Array.from(daysMap.entries()).sort(([a], [b]) => a - b).forEach(([dayNum, dayExs]) => {

        content.push({
            text: `GIORNO ${dayNum}`,
            style: 'dayTitle',
            margin: [0, 15, 0, 8] as [number, number, number, number],
        });

        // Tabella
        const tableBody = [
            // Header row
            [
                { text: 'Esercizio', style: 'tableHeader', alignment: 'left' as const },
                { text: 'Serie', style: 'tableHeader' },
                { text: 'Ripetizioni', style: 'tableHeader' },
                { text: 'Recupero', style: 'tableHeader' },
                { text: 'Note', style: 'tableHeader' }
            ]
        ];

        // Sort by ordine
        dayExs.sort((a, b) => a.ordine - b.ordine).forEach((ex, idx) => {
            const exName = ex.exercise?.nome || ex.nome || "Esercizio rimosso";
            tableBody.push([
                { text: `${idx + 1}. ${exName}`, style: 'tableCellBold', alignment: 'left' as const },
                { text: ex.serie || '-', style: 'tableCell' },
                { text: ex.ripetizioni || '-', style: 'tableCell' },
                { text: ex.recupero || '-', style: 'tableCell' },
                { text: ex.note_tecniche || '-', style: 'tableCellSmall', alignment: 'left' as const },
            ]);
        });

        content.push({
            table: {
                headerRows: 1,
                widths: ['*', '11%', '17%', '17%', '28%'],
                body: tableBody,
                dontBreakRows: true,
            },
            layout: {
                fillColor: (rowIndex: number) => {
                    if (rowIndex === 0) return null;
                    return rowIndex % 2 === 1 ? '#f8fafc' : null;
                },
                hLineWidth: () => 0.5,
                vLineWidth: () => 0,
                hLineColor: () => '#e2e8f0',
            },
        });
    });

    // Disclaimer / Nota importante fine pagina
    const workoutFooterText = trainerSettings?.pdf_workouts_footer || "Scheda per finalità di fitness/performance/benessere generale. Non sostituisce parere medico e non è un\ntrattamento sanitario. In presenza di patologie, dolore importante o sintomi anomali, interrompere l’attività\ne consultare un professionista sanitario.";
    content.push({
        text: [
            { text: "Nota importante\n", bold: true },
            workoutFooterText
        ],
        style: 'disclaimer',
        alignment: 'center' as const,
        margin: [0, 30, 0, 0] as [number, number, number, number],
    });

    const docDefinition = {
        content: content,
        pageMargins: [40, 40, 40, 60] as [number, number, number, number],
        footer: function (currentPage: number, pageCount: number) {
            return {
                columns: [
                    {
                        text: siteName,
                        alignment: 'left' as const,
                        margin: [40, 20, 0, 0] as [number, number, number, number],
                        fontSize: 8,
                        color: '#94a3b8',
                    },
                    {
                        text: `Pagina ${currentPage} di ${pageCount}`,
                        alignment: 'right' as const,
                        margin: [0, 20, 40, 0] as [number, number, number, number],
                        fontSize: 8,
                        color: '#94a3b8',
                    },
                ],
            };
        },
        styles: {
            headerLogo: { fontSize: 18, bold: true, color: primaryColor },
            header: { fontSize: 20, bold: true, color: '#1e293b' },
            subheader: { fontSize: 11, color: '#64748b' },
            boxLabel: { fontSize: 8, bold: true, color: '#94a3b8', characterSpacing: 0.5 },
            boxValue: { fontSize: 11, bold: true, color: '#1e293b' },
            sectionTitle: { fontSize: 10, bold: true, color: primaryColor, characterSpacing: 0.8 },
            dayTitle: { fontSize: 14, bold: true, color: primaryColor, characterSpacing: 0.5 },
            normalText: { fontSize: 10, color: '#475569', lineHeight: 1.4 },
            tableHeader: { bold: true, fontSize: 10, color: 'white', fillColor: primaryColor, alignment: 'center' as const, margin: [0, 5, 0, 5] as [number, number, number, number] },
            tableCell: { fontSize: 10, alignment: 'center' as const, color: '#334155', margin: [0, 6, 0, 6] as [number, number, number, number] },
            tableCellBold: { fontSize: 10, bold: true, color: '#1e293b', margin: [4, 6, 0, 6] as [number, number, number, number] },
            tableCellSmall: { fontSize: 9, italics: true, color: '#64748b', margin: [4, 6, 0, 6] as [number, number, number, number] },
            disclaimer: { fontSize: 8, color: '#94a3b8', italics: true, lineHeight: 1.3 },
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

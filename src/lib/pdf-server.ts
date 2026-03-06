import { workout_templates, workout_template_exercises, exercises } from "@/db/schema";

// Type definitions for internal use
type TemplateWithExercises = any;

/**
 * Genera un buffer PDF della scheda di allenamento (lato server)
 */
export async function generateWorkoutPDFBuffer(
    template: any,
    trainerSettings: any,
    clientData?: { nome: string; cognome: string; dataAssegnazione: string }
): Promise<Buffer> {
    let PdfPrinter;
    try {
        // Fix for Vercel build: path is case-sensitive and 'Printer' is capitalized
        PdfPrinter = require('pdfmake/js/Printer').default || require('pdfmake/js/Printer');
    } catch (e) {
        console.warn("Fallback for pdfmake require path");
        const mod = require('pdfmake/js/Printer');
        PdfPrinter = mod.default || mod;
    }

    if (typeof PdfPrinter !== 'function') {
        throw new Error(`PdfPrinter is not a constructor (type: ${typeof PdfPrinter})`);
    }

    // Configurazione font - Using project-local fonts to ensure Vercel bundles them
    const path = require('path');
    const fontsDir = path.join(process.cwd(), 'src', 'assets', 'fonts', 'Roboto');

    const fonts = {
        Roboto: {
            normal: path.join(fontsDir, 'Roboto-Regular.ttf'),
            bold: path.join(fontsDir, 'Roboto-Medium.ttf'),
            italics: path.join(fontsDir, 'Roboto-Italic.ttf'),
            bolditalics: path.join(fontsDir, 'Roboto-MediumItalic.ttf')
        }
    };

    const printer = new PdfPrinter(fonts);

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

    const content: any[] = [];

    // Header / Logo (semplificato per server side per ora, solo testo)
    content.push({
        text: trainerSettings?.site_name || "Ernesto Performance",
        style: 'headerLogo',
        alignment: 'center',
        margin: [0, 0, 0, 20]
    });

    // Titolo Scheda
    content.push({
        text: template.nome_template,
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 5]
    });

    // Info Cliente
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
        text: `${template.split_settimanale || 0} Sessioni a Settimana`,
        style: 'subheader',
        alignment: 'center',
        margin: [0, 5, 0, 20]
    });

    // Progressioni
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

    // Tabelle Giornaliere
    Array.from(daysMap.entries()).sort(([a], [b]) => a - b).forEach(([dayNum, dayExs]) => {
        content.push({
            text: `GIORNO ${dayNum}`,
            style: 'dayTitle',
            margin: [0, 20, 0, 10]
        });

        const tableBody = [
            [
                { text: 'Esercizio', style: 'tableHeader' },
                { text: 'Serie', style: 'tableHeader' },
                { text: 'Ripetizioni', style: 'tableHeader' },
                { text: 'Recupero', style: 'tableHeader' },
                { text: 'RPE/Buffer', style: 'tableHeader' },
                { text: 'Note', style: 'tableHeader' }
            ]
        ];

        dayExs.sort((a, b) => a.ordine - b.ordine).forEach((ex, idx) => {
            const exName = ex.exercise?.nome || ex.nome || "Esercizio";
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

    const footerText = trainerSettings?.pdf_workouts_footer || "Scheda per finalità di fitness/performance/benessere generale. Non sostituisce parere medico.";
    content.push({
        text: [
            { text: "Nota importante\n", bold: true },
            footerText
        ],
        style: 'footer',
        alignment: 'center',
        margin: [0, 40, 0, 0]
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
            normalText: { fontSize: 11, color: '#475569' },
            tableHeader: { bold: true, fontSize: 11, color: 'white', fillColor: trainerSettings?.primary_color || '#003366', alignment: 'center' },
            tableCell: { fontSize: 10, alignment: 'center', margin: [0, 5, 0, 5] },
            tableCellBold: { fontSize: 11, bold: true, margin: [0, 5, 0, 5] },
            tableCellSmall: { fontSize: 9, italics: true, color: '#64748b', margin: [0, 5, 0, 5] },
            footer: { fontSize: 9, color: '#64748b' }
        },
        defaultStyle: { font: 'Roboto' }
    };

    const pdfDoc = await printer.createPdfKitDocument(docDefinition);

    return new Promise((resolve, reject) => {
        const chunks: any[] = [];
        pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', (err: any) => reject(err));
        pdfDoc.end();
    });
}

import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
    if (!_resend && process.env.RESEND_API_KEY) {
        _resend = new Resend(process.env.RESEND_API_KEY);
    }
    return _resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

// Stili base per le email
const emailStyles = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
    .header { background-color: #0f172a; padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .content { padding: 40px; color: #334155; line-height: 1.6; }
    .title { font-size: 20px; font-weight: 600; color: #0f172a; margin-top: 0; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
    .greeting { font-size: 16px; margin-bottom: 16px; }
    .message-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .message-box.offer { background-color: #f0fdf4; border-color: #bbf7d0; }
    .message-box.workout { border-left: 4px solid #3b82f6; }
    .footer { padding: 32px 40px; text-align: center; background-color: #f8fafc; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 13px; }
    .button { display: inline-block; background-color: #3b82f6; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; margin-top: 16px; text-align: center; }
`;

/**
 * Invia email quando viene assegnata una scheda al cliente
 */
export async function sendWorkoutAssignmentEmail(params: {
    clientEmail: string;
    clientName: string;
    workoutName: string;
    trainerName: string;
    trainerEmail: string;
    platformName: string;
    attachments?: { filename: string; content: Buffer }[];
}) {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn("RESEND_API_KEY non configurata, email non inviata");
            return { success: false, error: "API key mancante" };
        }

        const domain = FROM_EMAIL.includes("@") ? FROM_EMAIL.split("@")[1] : FROM_EMAIL;
        const trainerPrefix = params.trainerEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, '.');
        const fromAddress = `${params.trainerName} <${trainerPrefix}@${domain}>`;

        const { data, error } = await getResend()!.emails.send({
            from: fromAddress,
            to: params.clientEmail,
            replyTo: params.trainerEmail,
            subject: `Nuova scheda di allenamento: ${params.workoutName}`,
            attachments: params.attachments,
            html: `
                <!DOCTYPE html>
                <html>
                <head><style>${emailStyles}</style></head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>${params.platformName}</h1>
                        </div>
                        <div class="content">
                            <h2 class="title">🏋️ Nuova Scheda Assegnata</h2>
                            <p class="greeting">Ciao <strong>${params.clientName}</strong>,</p>
                            <p>Il tuo trainer <strong>${params.trainerName}</strong> ha preparato un nuovo programma di allenamento per te.</p>
                            
                            <div class="message-box workout">
                                <h3 style="margin: 0; color: #0f172a; font-size: 18px;">${params.workoutName}</h3>
                                <p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px;">In allegato a questa email trovi il PDF con tutti i dettagli.</p>
                            </div>
                            
                            <p>Ti consigliamo di scaricare e conservare il file per consultarlo durante i tuoi allenamenti.</p>
                        </div>
                        <div class="footer">
                            <p style="margin: 0;">Questa email è stata inviata automaticamente da ${params.platformName}.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        });

        if (error) {
            console.error("Errore invio email assegnazione:", error);
            return { success: false, error: error.message };
        }

        return { success: true, id: data?.id };
    } catch (error) {
        console.error("Errore invio email:", error);
        return { success: false, error: "Errore generico" };
    }
}

/**
 * Invia email per annuncio/offerta ai clienti
 */
export async function sendAnnouncementEmail(params: {
    recipients: { email: string; nome: string }[];
    titolo: string;
    contenuto: string;
    tipo: string;
    trainerName: string;
    trainerEmail: string;
    platformName: string;
    attachments?: { filename: string; content: Buffer }[];
}) {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn("RESEND_API_KEY non configurata, email non inviate");
            return { success: false, error: "API key mancante" };
        }

        const domain = FROM_EMAIL.includes("@") ? FROM_EMAIL.split("@")[1] : FROM_EMAIL;
        const trainerPrefix = params.trainerEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, '.');
        const fromAddress = `${params.trainerName} <${trainerPrefix}@${domain}>`;

        const isOffer = params.tipo === "offerta";
        const boxClass = isOffer ? "message-box offer" : "message-box";
        const results = [];

        for (const recipient of params.recipients) {
            try {
                const { data, error } = await getResend()!.emails.send({
                    from: fromAddress,
                    to: recipient.email,
                    replyTo: params.trainerEmail,
                    subject: `${params.titolo}`,
                    attachments: params.attachments,
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head><style>${emailStyles}</style></head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>${params.platformName}</h1>
                                </div>
                                <div class="content">
                                    <h2 class="title" style="color: ${isOffer ? '#166534' : '#0f172a'};">${params.titolo}</h2>
                                    <p class="greeting">Ciao <strong>${recipient.nome}</strong>,</p>
                                    
                                    <div class="${boxClass}">
                                        <div style="font-size: 15px; line-height: 1.6; color: #334155;">
                                            ${params.contenuto.replace(/\\n/g, '<br>')}
                                        </div>
                                    </div>
                                    
                                    <p style="margin-top: 32px;">
                                        Un caro saluto,<br>
                                        <strong>${params.trainerName}</strong>
                                    </p>
                                </div>
                                <div class="footer">
                                    <p style="margin: 0;">Hai ricevuto questa comunicazione in quanto iscritto a ${params.platformName}.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `,
                });

                if (error) {
                    results.push({ email: recipient.email, success: false, error: error.message });
                } else {
                    results.push({ email: recipient.email, success: true, id: data?.id });
                }
            } catch {
                results.push({ email: recipient.email, success: false, error: "Errore invio" });
            }
        }

        const successCount = results.filter(r => r.success).length;
        return { success: true, sent: successCount, total: results.length, results };
    } catch (error) {
        console.error("Errore invio email annuncio:", error);
        return { success: false, error: "Errore generico" };
    }
}

/**
 * Notifica al trainer: cliente ha completato un allenamento
 */
export async function sendClientLoggedWorkoutEmail(params: {
    trainerEmail: string;
    clientName: string;
    workoutName: string;
    date: string;
    durationMinutes: number;
    platformName: string;
}) {
    try {
        if (!process.env.RESEND_API_KEY) return { success: false, error: "API key mancante" };
        const { data, error } = await getResend()!.emails.send({
            from: FROM_EMAIL,
            to: params.trainerEmail,
            subject: `${params.clientName} ha completato un allenamento`,
            html: `
                <!DOCTYPE html>
                <html><head><style>${emailStyles}</style></head>
                <body>
                    <div class="container">
                        <div class="header"><h1>${params.platformName}</h1></div>
                        <div class="content">
                            <h2 class="title">Allenamento completato</h2>
                            <p><strong>${params.clientName}</strong> ha completato un allenamento.</p>
                            <p><strong>Scheda:</strong> ${params.workoutName}<br>
                            <strong>Data:</strong> ${params.date}<br>
                            <strong>Durata:</strong> ${params.durationMinutes} minuti</p>
                        </div>
                        <div class="footer"><p style="margin: 0;">&copy; ${new Date().getFullYear()} ${params.platformName}.</p></div>
                    </div>
                </body></html>
            `,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, id: data?.id };
    } catch (e) {
        console.error("Errore email notifica trainer:", e);
        return { success: false, error: "Errore generico" };
    }
}

/**
 * Invia email di invito al portale cliente
 */
export async function sendClientInviteEmail(params: {
    clientEmail: string;
    clientName: string;
    trainerName: string;
    inviteLink: string;
    platformName: string;
}) {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn("RESEND_API_KEY non configurata, email non inviata");
            return { success: false, error: "API key mancante" };
        }

        const { data, error } = await getResend()!.emails.send({
            from: FROM_EMAIL,
            to: params.clientEmail,
            subject: `Sei stato invitato su ${params.platformName}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head><style>${emailStyles}</style></head>
                <body>
                    <div class="container">
                        <div class="header"><h1>${params.platformName}</h1></div>
                        <div class="content">
                            <h2 class="title">Benvenuto, ${params.clientName}!</h2>
                            <p>${params.trainerName} ti ha invitato sul portale clienti di ${params.platformName}.</p>
                            <p>Da qui potrai consultare le tue schede, tracciare i tuoi progressi, vedere documenti e gestire il tuo abbonamento.</p>
                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${params.inviteLink}" class="button">Attiva il tuo Account</a>
                            </div>
                            <p>Il link scadrà tra 7 giorni. Se hai problemi, contatta il tuo trainer.</p>
                            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
                                Se il pulsante non funziona, copia questo link nel browser:<br>
                                <span style="word-break: break-all;">${params.inviteLink}</span>
                            </p>
                        </div>
                        <div class="footer">
                            <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${params.platformName}.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, id: data?.id };
    } catch (e) {
        console.error("Errore invio invito cliente:", e);
        return { success: false, error: "Errore generico" };
    }
}

/**
 * Invia email di recupero password al cliente
 */
export async function sendClientPasswordResetEmail(params: {
    email: string;
    clientName: string;
    resetLink: string;
    platformName: string;
}) {
    try {
        if (!process.env.RESEND_API_KEY) {
            return { success: false, error: "API key mancante" };
        }
        const { data, error } = await getResend()!.emails.send({
            from: FROM_EMAIL,
            to: params.email,
            subject: `Recupero Password - ${params.platformName}`,
            html: `
                <!DOCTYPE html>
                <html><head><style>${emailStyles}</style></head>
                <body>
                    <div class="container">
                        <div class="header"><h1>${params.platformName}</h1></div>
                        <div class="content">
                            <h2 class="title">Recupero Password</h2>
                            <p>Ciao <strong>${params.clientName}</strong>,</p>
                            <p>Hai richiesto il ripristino password del tuo account su ${params.platformName}.</p>
                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${params.resetLink}" class="button">Reimposta Password</a>
                            </div>
                            <p>Se non hai richiesto tu il ripristino, ignora questa email. Il link scadrà tra 1 ora.</p>
                        </div>
                        <div class="footer"><p style="margin: 0;">&copy; ${new Date().getFullYear()} ${params.platformName}.</p></div>
                    </div>
                </body></html>
            `,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, id: data?.id };
    } catch (e) {
        console.error("Errore email reset cliente:", e);
        return { success: false, error: "Errore generico" };
    }
}

/**
 * Invia email per il recupero password
 */
export async function sendPasswordResetEmail(params: {
    email: string;
    trainerName: string;
    resetLink: string;
    platformName: string;
}) {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn("RESEND_API_KEY non configurata, email non inviata");
            return { success: false, error: "API key mancante" };
        }

        const { data, error } = await getResend()!.emails.send({
            from: FROM_EMAIL,
            to: params.email,
            subject: `Recupero Password - ${params.platformName}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head><style>${emailStyles}</style></head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>${params.platformName}</h1>
                        </div>
                        <div class="content">
                            <h2 class="title">Recupero Password</h2>
                            <p class="greeting">Ciao <strong>${params.trainerName}</strong>,</p>
                            <p>Abbiamo ricevuto una richiesta di ripristino della password per il tuo account su ${params.platformName}.</p>
                            
                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${params.resetLink}" class="button">Reimposta Password</a>
                            </div>
                            
                            <p>Se non hai richiesto tu il ripristino, puoi ignorare questa email in sicurezza. Il link scadrà tra 1 ora.</p>
                            
                            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
                                Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br>
                                <span style="word-break: break-all;">${params.resetLink}</span>
                            </p>
                        </div>
                        <div class="footer">
                            <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${params.platformName}. Tutti i diritti riservati.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        });

        if (error) {
            console.error("Errore invio email reset:", error);
            return { success: false, error: error.message };
        }

        return { success: true, id: data?.id };
    } catch (error) {
        console.error("Errore invio email reset:", error);
        return { success: false, error: "Errore generico" };
    }
}

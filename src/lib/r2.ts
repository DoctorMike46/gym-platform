import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "gym-documents";

const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

/**
 * Upload un file su Cloudflare R2
 */
export async function uploadToR2(params: {
    key: string;
    body: Buffer;
    contentType: string;
}): Promise<{ success: boolean; key: string }> {
    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: params.key,
            Body: params.body,
            ContentType: params.contentType,
        }));
        return { success: true, key: params.key };
    } catch (error) {
        console.error("Errore upload R2:", error);
        throw error;
    }
}

/**
 * Genera un URL firmato temporaneo per il download (valido 1 ora)
 */
export async function getR2SignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
    });
    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

/**
 * Elimina un file da Cloudflare R2
 */
export async function deleteFromR2(key: string): Promise<void> {
    await s3Client.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
    }));
}

/**
 * Scarica un file da R2 come Buffer (utile per allegati email)
 */
export async function downloadFromR2(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
    });
    const response = await s3Client.send(command);
    if (!response.Body) throw new Error("File non trovato su R2");

    // Per Node.js, Body è un Readable stream
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as unknown as AsyncIterable<Buffer>) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

/**
 * Genera una chiave R2 unica per un documento
 */
export function generateR2Key(trainerId: number, clientId: number, fileName: string): string {
    const timestamp = Date.now();
    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `trainers/${trainerId}/clients/${clientId}/${timestamp}_${sanitized}`;
}

/**
 * Genera una chiave R2 unica per un'immagine annuncio
 */
export function generateAnnouncementR2Key(trainerId: number, fileName: string): string {
    const timestamp = Date.now();
    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `trainers/${trainerId}/announcements/${timestamp}_${sanitized}`;
}

/**
 * Genera una chiave R2 per una foto progresso del cliente
 */
export function generateProgressPhotoKey(clientId: number, type: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `clients/${clientId}/progress/${timestamp}_${type}_${sanitized}`;
}

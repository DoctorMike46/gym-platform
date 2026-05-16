import OpenAI from "openai";

/**
 * Client OpenAI condiviso. Richiede OPENAI_API_KEY in .env.
 * Modello default: gpt-4o-mini (più economico, supporta vision e JSON
 * strutturato).
 */
let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
    if (!_client) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY non configurata");
        }
        _client = new OpenAI({ apiKey });
    }
    return _client;
}

export const OPENAI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
export const OPENAI_VISION_MODEL =
    process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

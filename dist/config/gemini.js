"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReply = void 0;
const genai_1 = require("@google/genai");
const resolveModel = (mode) => {
    if (mode === 'thinking' || mode === 'research')
        return 'gemini-2.5-pro';
    if (mode === 'search')
        return 'gemini-2.5-flash';
    return 'gemini-2.5-flash';
};
const generateReply = async (message, mode) => {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!key) {
        console.error('[Gemini] Missing GEMINI_API_KEY. Set GEMINI_API_KEY in backend .env');
        throw new Error('Gemini API key is not configured');
    }
    const ai = new genai_1.GoogleGenAI({ apiKey: key });
    console.log('[Gemini] request', { model: resolveModel(mode), length: message.length });
    let response;
    try {
        response = await ai.models.generateContent({
            model: resolveModel(mode),
            contents: message,
        });
    }
    catch (e) {
        const msg = e?.message || String(e);
        console.error('[Gemini] SDK error', msg);
        throw new Error('Gemini service failed');
    }
    const text = response?.text;
    console.log('[Gemini] response length', typeof text === 'string' ? text.length : 0);
    if (typeof text !== 'string' || !text) {
        throw new Error('Gemini returned empty response');
    }
    return text;
};
exports.generateReply = generateReply;

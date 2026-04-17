// Keep the live voice Gemini model/version centralized for the browser client.

// v1beta is the SDK default API version (v1alpha is for ephemeral tokens only).
export const GEMINI_LIVE_API_VERSION = 'v1beta';

// Gemini 2.5 Flash Native Audio — supports bidiGenerateContent (Live API).
// Confirmed via models.list API: only *-native-audio-* models support bidiGenerateContent.
export const GEMINI_LIVE_MODEL = 'gemini-2.5-flash-native-audio-latest';

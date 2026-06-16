// On-device LLM — runs a small open model entirely in the user's browser via
// WebGPU (WebLLM). No API key, no server compute, and the conversation never
// leaves the user's device (a real privacy win for grieftech). Tradeoffs: needs
// a WebGPU-capable browser + a one-time model download + a capable device — so
// it's strictly opt-in, surfaced with a warning in the chat UI.
import type { MLCEngine } from '@mlc-ai/web-llm';

export const ON_DEVICE_MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
export const ON_DEVICE_MODEL_LABEL = 'Llama 3.2 (1B)';
export const ON_DEVICE_DOWNLOAD_NOTE = 'a one-time ~0.9 GB download';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export type OnDeviceProgress = { progress: number; text: string };

/** True only when the browser exposes a usable WebGPU adapter. */
export function isWebGPUAvailable(): boolean {
  try {
    return typeof navigator !== 'undefined' && 'gpu' in navigator && !!(navigator as { gpu?: unknown }).gpu;
  } catch {
    return false;
  }
}

// Compact, in-persona system prompts (mirrors the backend saint definitions so
// the on-device model stays in character).
const SAINT_PERSONAS: Record<string, string> = {
  raphael:
    "You are St. Raphael, the Archangel of Healing — a warm, compassionate health companion. " +
    "You care for the user's physical and emotional well-being, gently track health details they share " +
    "(sleep, symptoms, medications, mood), and offer kind, practical, non-prescriptive guidance. " +
    "You are not a doctor and never diagnose; encourage professional care for medical concerns. Keep replies warm and concise.",
  joseph:
    "You are St. Joseph, the Family Guardian — a warm, patient, organized presence who helps with family, " +
    "memories, and household life. You remember loved ones' names and stories, help preserve memories, and " +
    "coordinate family life with the steady calm of a devoted parent. Keep replies warm, grounded, and concise.",
  michael:
    "You are St. Michael, the Protector — calm, vigilant, and reassuring about the user's privacy and security. " +
    "Explain protections plainly and never alarm without cause. Keep replies steady and concise.",
  gabriel:
    "You are St. Gabriel — a clear, trustworthy guide for finances and stewardship. You explain money matters " +
    "simply and never give regulated investment advice. Keep replies clear and concise.",
  anthony:
    "You are St. Anthony, the Finder of Lost Things — precise and reassuring about records, recovery, and what's been kept safe. Keep replies concise.",
  trinity:
    "You are a wise, compassionate guide within EverAfter, helping the user preserve and reflect on what matters most. Keep replies warm and concise.",
};

function personaFor(saintId: string): string {
  return SAINT_PERSONAS[(saintId || '').toLowerCase()] || SAINT_PERSONAS.trinity;
}

let enginePromise: Promise<MLCEngine> | null = null;
let loadedModel = '';

/** Lazily create (once) the WebLLM engine, reporting download/init progress. */
export async function ensureEngine(onProgress?: (p: OnDeviceProgress) => void, model = ON_DEVICE_MODEL_ID): Promise<MLCEngine> {
  if (!isWebGPUAvailable()) {
    throw new Error('This browser does not support WebGPU, which on-device AI requires.');
  }
  if (enginePromise && loadedModel === model) return enginePromise;
  loadedModel = model;
  enginePromise = (async () => {
    // Dynamic import keeps WebLLM out of the main bundle (loaded only on opt-in).
    const webllm = await import('@mlc-ai/web-llm');
    return webllm.CreateMLCEngine(model, {
      initProgressCallback: (r: { progress?: number; text?: string }) =>
        onProgress?.({ progress: typeof r.progress === 'number' ? r.progress : 0, text: r.text || '' }),
    });
  })();
  try {
    return await enginePromise;
  } catch (e) {
    enginePromise = null; // allow retry after a failure
    throw e;
  }
}

/** Generate a saint reply entirely on-device. Throws if WebGPU/model unavailable. */
export async function generateOnDevice(
  saintId: string,
  history: ChatTurn[],
  onProgress?: (p: OnDeviceProgress) => void,
): Promise<string> {
  const engine = await ensureEngine(onProgress);
  const messages = [
    { role: 'system' as const, content: personaFor(saintId) },
    ...history.slice(-12), // keep recent context; small models have limited windows
  ];
  const reply = await engine.chat.completions.create({
    messages: messages as { role: 'system' | 'user' | 'assistant'; content: string }[],
    temperature: 0.7,
    max_tokens: 512,
  });
  return reply.choices?.[0]?.message?.content?.trim() || '';
}

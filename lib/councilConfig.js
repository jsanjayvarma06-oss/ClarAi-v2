/**
 * councilConfig.js
 * June 27, 2026 — Groq-only council using verified active production models.
 *
 * NVIDIA NIM removed: their free tier requires per-model credit enablement
 * which causes 404s for accounts that haven't activated specific models.
 *
 * Groq source: https://console.groq.com/docs/models (verified today)
 * All 5 models below are confirmed production/active as of June 27, 2026.
 *
 * Note: llama-3.3-70b-versatile and llama-3.1-8b-instant deprecate Aug 16, 2026.
 * Replacements (gpt-oss-120b, qwen3.6-27b) are already in the council.
 */

export const PROVIDERS = {
  groq: {
    baseUrl:    'https://api.groq.com/openai/v1/chat/completions',
    authHeader: () => `Bearer ${process.env.GROQ_API_KEY}`,
  },
};

/**
 * COUNCIL_MEMBERS — 5 diverse Groq models, all verified active today.
 * Covers different architectures: Llama, GPT-OSS (OpenAI open weights), Qwen.
 */
export const COUNCIL_MEMBERS = [
  {
    id:       'groq-llama33-70b',
    provider: 'groq',
    model:    'llama-3.3-70b-versatile',
    label:    'Llama 3.3 70B',
  },
  {
    id:       'groq-llama31-8b',
    provider: 'groq',
    model:    'llama-3.1-8b-instant',
    label:    'Llama 3.1 8B',
  },
  {
    id:       'groq-gpt-oss-20b',
    provider: 'groq',
    model:    'openai/gpt-oss-20b',
    label:    'GPT-OSS 20B',
  },
  {
    id:       'groq-gpt-oss-120b',
    provider: 'groq',
    model:    'openai/gpt-oss-120b',
    label:    'GPT-OSS 120B',
  },
  {
    id:       'groq-qwen36-27b',
    provider: 'groq',
    model:    'qwen/qwen3.6-27b',
    label:    'Qwen 3.6 27B',
  },
];

/**
 * CHAIRMAN — GPT-OSS 120B: Groq's best model, 500 t/s.
 */
export const CHAIRMAN = {
  id:       'groq-gpt-oss-120b-chair',
  provider: 'groq',
  model:    'openai/gpt-oss-120b',
  label:    'GPT-OSS 120B — Chairman',
};

export const TIMEOUTS = {
  groq: 30_000,
};

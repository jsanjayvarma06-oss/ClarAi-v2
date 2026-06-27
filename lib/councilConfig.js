/**
 * councilConfig.js
 * Updated June 27, 2026 — verified active models only.
 *
 * Groq source:  https://console.groq.com/docs/models
 * NVIDIA source: https://build.nvidia.com/models + community verification
 *
 * Removed (decommissioned):
 *   Groq: gemma2-9b-it, qwen-qwq-32b, deepseek-r1-distill-llama-70b
 *   NVIDIA: deepseek-ai/deepseek-r1, qwen/qwen2.5-72b-instruct,
 *           mistralai/mistral-7b-instruct-v0.3, microsoft/phi-3-medium-128k-instruct
 */

export const PROVIDERS = {
  nvidia: {
    baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    authHeader: () => `Bearer ${process.env.NVIDIA_API_KEY}`,
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    authHeader: () => `Bearer ${process.env.GROQ_API_KEY}`,
  },
};

/**
 * COUNCIL_MEMBERS
 * 8 diverse models across both providers — all verified active June 2026.
 * Mix of architectures: Llama, Mixtral MoE, Qwen, MiniMax MoE, DeepSeek, GLM, Kimi, GPT-OSS.
 */
export const COUNCIL_MEMBERS = [
  // ── Groq (fast LPU inference) ─────────────────────────────────────────────
  {
    id:       'groq-llama33-70b',
    provider: 'groq',
    model:    'llama-3.3-70b-versatile',
    label:    'Llama 3.3 70B (Groq)',
  },
  {
    id:       'groq-gpt-oss-20b',
    provider: 'groq',
    model:    'openai/gpt-oss-20b',
    label:    'GPT-OSS 20B (Groq)',
  },
  {
    id:       'groq-qwen3-32b',
    provider: 'groq',
    model:    'qwen/qwen3-32b',
    label:    'Qwen3 32B (Groq)',
  },
  {
    id:       'groq-mixtral',
    provider: 'groq',
    model:    'mixtral-8x7b-32768',
    label:    'Mixtral 8x7B (Groq)',
  },

  // ── NVIDIA NIM (DGX Cloud, 100+ free models) ──────────────────────────────
  {
    id:       'nvidia-llama-70b',
    provider: 'nvidia',
    model:    'meta/llama-3.1-70b-instruct',
    label:    'Llama 3.1 70B (NVIDIA)',
  },
  {
    id:       'nvidia-minimax',
    provider: 'nvidia',
    model:    'minimaxai/minimax-m2.7',
    label:    'MiniMax M2.7 (NVIDIA)',
  },
  {
    id:       'nvidia-deepseek-v3',
    provider: 'nvidia',
    model:    'deepseek-ai/deepseek-v3.2',
    label:    'DeepSeek V3.2 (NVIDIA)',
  },
  {
    id:       'nvidia-mistral-large',
    provider: 'nvidia',
    model:    'mistralai/mistral-large-2-instruct',
    label:    'Mistral Large 2 (NVIDIA)',
  },
];

/**
 * CHAIRMAN — synthesises the final answer from all stage 1 + 2 results.
 * GPT-OSS 120B on Groq: best quality free model available June 2026.
 */
export const CHAIRMAN = {
  id:       'groq-gpt-oss-120b-chair',
  provider: 'groq',
  model:    'openai/gpt-oss-120b',
  label:    'GPT-OSS 120B — Chairman',
};

/**
 * Timeouts (ms). NVIDIA NIM can be slower on first token for large models.
 */
export const TIMEOUTS = {
  nvidia: 60_000,
  groq:   25_000,
};

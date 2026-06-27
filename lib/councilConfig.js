/**
 * councilConfig.js
 * All free-tier models from NVIDIA NIM and Groq used as council members.
 * Each provider has its own base URL and auth format.
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
 * COUNCIL_MEMBERS — diverse mix of architectures and sizes.
 * All are free-tier on their respective platforms as of mid-2025.
 * Spread across providers so rate limits don't bottleneck the whole council.
 */
export const COUNCIL_MEMBERS = [
  // NVIDIA NIM — strong open-source flagships
  { id: 'nvidia-llama-70b',    provider: 'nvidia', model: 'meta/llama-3.3-70b-instruct',         label: 'Llama 3.3 70B (NVIDIA)' },
  { id: 'nvidia-deepseek-r1',  provider: 'nvidia', model: 'deepseek-ai/deepseek-r1',              label: 'DeepSeek R1 (NVIDIA)'   },
  { id: 'nvidia-qwen-72b',     provider: 'nvidia', model: 'qwen/qwen2.5-72b-instruct',            label: 'Qwen 2.5 72B (NVIDIA)'  },
  { id: 'nvidia-mistral',      provider: 'nvidia', model: 'mistralai/mistral-7b-instruct-v0.3',   label: 'Mistral 7B (NVIDIA)'    },

  // Groq — blazing fast inference
  { id: 'groq-llama-70b',      provider: 'groq',   model: 'llama-3.3-70b-versatile',             label: 'Llama 3.3 70B (Groq)'   },
  { id: 'groq-deepseek-r1',    provider: 'groq',   model: 'deepseek-r1-distill-llama-70b',        label: 'DeepSeek R1 70B (Groq)' },
  { id: 'groq-gemma2',         provider: 'groq',   model: 'gemma2-9b-it',                         label: 'Gemma 2 9B (Groq)'      },
  { id: 'groq-qwq',            provider: 'groq',   model: 'qwen-qwq-32b',                         label: 'QwQ 32B (Groq)'         },
];

/**
 * CHAIRMAN_MODEL — synthesizes the final answer.
 * Llama 3.3 70B on Groq: fast + high quality, best free option for synthesis.
 */
export const CHAIRMAN = {
  id: 'groq-llama-70b-chair',
  provider: 'groq',
  model: 'llama-3.3-70b-versatile',
  label: 'Llama 3.3 70B — Chairman',
};

/**
 * Per-request timeouts (ms).
 * NVIDIA NIM can be slower on first token; Groq is near-instant.
 */
export const TIMEOUTS = {
  nvidia: 45_000,
  groq: 20_000,
};

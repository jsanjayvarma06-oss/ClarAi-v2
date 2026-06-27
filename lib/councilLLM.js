/**
 * councilConfig.js
 * Updated June 2026 — verified active models on NVIDIA NIM and Groq.
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

export const COUNCIL_MEMBERS = [
  // NVIDIA NIM
  { id: 'nvidia-llama-70b',   provider: 'nvidia', model: 'meta/llama-3.3-70b-instruct',       label: 'Llama 3.3 70B (NVIDIA)'  },
  { id: 'nvidia-llama-8b',    provider: 'nvidia', model: 'meta/llama-3.1-8b-instruct',         label: 'Llama 3.1 8B (NVIDIA)'   },
  { id: 'nvidia-mistral',     provider: 'nvidia', model: 'mistralai/mistral-7b-instruct-v0.3', label: 'Mistral 7B (NVIDIA)'     },
  { id: 'nvidia-phi3',        provider: 'nvidia', model: 'microsoft/phi-3-medium-128k-instruct',label: 'Phi-3 Medium (NVIDIA)'   },

  // Groq — verified active models
  { id: 'groq-llama-70b',     provider: 'groq',   model: 'llama-3.3-70b-versatile',            label: 'Llama 3.3 70B (Groq)'    },
  { id: 'groq-llama-8b',      provider: 'groq',   model: 'llama-3.1-8b-instant',               label: 'Llama 3.1 8B (Groq)'     },
  { id: 'groq-llama3-70b',    provider: 'groq',   model: 'llama3-70b-8192',                    label: 'Llama3 70B (Groq)'       },
  { id: 'groq-mixtral',       provider: 'groq',   model: 'mixtral-8x7b-32768',                 label: 'Mixtral 8x7B (Groq)'     },
];

export const CHAIRMAN = {
  id: 'groq-llama-70b-chair',
  provider: 'groq',
  model: 'llama-3.3-70b-versatile',
  label: 'Llama 3.3 70B — Chairman',
};

export const TIMEOUTS = {
  nvidia: 45_000,
  groq:   20_000,
};

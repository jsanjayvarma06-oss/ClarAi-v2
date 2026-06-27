/**
 * councilLLM.js
 * Low-level fetch helpers for NVIDIA NIM and Groq (both are OpenAI-compatible).
 * Handles per-provider auth, timeout, and graceful failure.
 */

import { PROVIDERS, TIMEOUTS } from './councilConfig.js';

/**
 * Query a single council member.
 * Returns { id, label, content } on success, or { id, label, error } on failure.
 */
export async function queryMember(member, messages) {
  const provider = PROVIDERS[member.provider];
  const timeout = TIMEOUTS[member.provider];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(provider.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: provider.authHeader(),
      },
      body: JSON.stringify({
        model: member.model,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`HTTP ${res.status}: ${err}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    return { id: member.id, label: member.label, content };
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[Council] ${member.label} failed:`, err.message);
    return { id: member.id, label: member.label, error: err.message };
  }
}

/**
 * Query all members in parallel using Promise.allSettled so one failure
 * never blocks the others.
 */
export async function queryAllMembers(members, messages) {
  const results = await Promise.allSettled(members.map(m => queryMember(m, messages)));
  return results.map(r => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message }));
}

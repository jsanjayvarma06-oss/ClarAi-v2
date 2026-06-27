/**
 * council.js
 * 3-stage LLM council orchestration — adapted from karpathy/llm-council.
 *
 * Stage 1: All council members answer the user's request independently (parallel).
 * Stage 2: All members rank each other's anonymised responses (parallel).
 * Stage 3: Chairman model synthesises a final, distilled answer.
 */

import { COUNCIL_MEMBERS, CHAIRMAN } from './councilConfig.js';
import { queryAllMembers, queryMember } from './councilLLM.js';

// ─── Stage 1 ────────────────────────────────────────────────────────────────

/**
 * Collect one response per council member for the given prompt.
 * @param {string} systemPrompt  Built by orchestrator.js
 * @param {string} userMessage   The user's actual request
 * @returns {Array<{id, label, content}>}  Successful responses only
 */
export async function stage1_collectResponses(systemPrompt, userMessage) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userMessage  },
  ];

  const raw = await queryAllMembers(COUNCIL_MEMBERS, messages);

  // Drop members that errored out — council still works with partial quorum
  const successful = raw.filter(r => r.content && !r.error);

  if (successful.length === 0) {
    throw new Error('All council members failed to respond. Check your API keys and rate limits.');
  }

  return successful;
}

// ─── Stage 2 ────────────────────────────────────────────────────────────────

/**
 * Each member evaluates and ranks the anonymised Stage 1 responses.
 * @param {string} userMessage    Original request (for context)
 * @param {Array}  stage1Results  Output of stage1_collectResponses
 * @returns {{ rankings: Array, labelToMember: Object, aggregated: Array }}
 */
export async function stage2_collectRankings(userMessage, stage1Results) {
  // Assign anonymous labels A, B, C…
  const labels = stage1Results.map((_, i) => String.fromCharCode(65 + i));
  const labelToMember = Object.fromEntries(
    labels.map((lbl, i) => [`Response ${lbl}`, stage1Results[i]])
  );

  const responsesText = stage1Results
    .map((r, i) => `Response ${labels[i]}:\n${r.content}`)
    .join('\n\n---\n\n');

  const rankingPrompt = `You are evaluating multiple AI responses to the following request:

REQUEST: ${userMessage}

RESPONSES (anonymised):
${responsesText}

Your task:
1. Briefly evaluate each response's strengths and weaknesses.
2. End your reply with a final ranking section formatted EXACTLY like this:

FINAL RANKING:
1. Response X
2. Response Y
3. Response Z

(Use the actual letter labels from above. No other text in the ranking section.)`;

  const messages = [{ role: 'user', content: rankingPrompt }];
  const raw = await queryAllMembers(COUNCIL_MEMBERS, messages);
  const successful = raw.filter(r => r.content && !r.error);

  // Parse rankings and compute aggregate scores (lower avg rank = better)
  const aggregated = computeAggregateRankings(successful, labelToMember);

  return { rankings: successful, labelToMember, aggregated };
}

// ─── Stage 3 ────────────────────────────────────────────────────────────────

/**
 * Chairman synthesises the final answer from all stage 1 responses + rankings.
 */
export async function stage3_synthesise(userMessage, stage1Results, stage2Data) {
  const { rankings, aggregated } = stage2Data;

  const responsesBlock = stage1Results
    .map(r => `[${r.label}]\n${r.content}`)
    .join('\n\n---\n\n');

  const rankingBlock = aggregated
    .map((r, i) => `${i + 1}. ${r.label} (avg rank: ${r.avgRank.toFixed(2)})`)
    .join('\n');

  const chairmanPrompt = `You are the Chairman of an LLM Council. Multiple AI models answered the user's request, then peer-reviewed each other's answers.

USER REQUEST: ${userMessage}

INDIVIDUAL RESPONSES:
${responsesBlock}

AGGREGATE PEER RANKINGS (1 = best):
${rankingBlock}

Your job: synthesise the best possible final answer.
- Incorporate the strongest insights from all responses.
- Resolve any contradictions using the peer rankings as a quality signal.
- Be clear, well-structured, and directly useful to the user.
- Do NOT mention the council process or the other models — just deliver the answer.`;

  const result = await queryMember(CHAIRMAN, [{ role: 'user', content: chairmanPrompt }]);

  if (result.error) {
    // Fallback: return the top-ranked stage 1 response if chairman fails
    const topMember = stage1Results.find(r => r.id === aggregated[0]?.id) ?? stage1Results[0];
    return {
      content: topMember.content,
      chairmanFailed: true,
      fallbackMember: topMember.label,
    };
  }

  return { content: result.content, chairmanFailed: false };
}

// ─── Full pipeline ───────────────────────────────────────────────────────────

/**
 * Run the complete 3-stage council and return structured results.
 */
export async function runCouncil(systemPrompt, userMessage) {
  // Stage 1 — parallel responses
  const stage1Results = await stage1_collectResponses(systemPrompt, userMessage);

  // Stage 2 — parallel peer ranking
  const stage2Data = await stage2_collectRankings(userMessage, stage1Results);

  // Stage 3 — chairman synthesis
  const final = await stage3_synthesise(userMessage, stage1Results, stage2Data);

  return {
    final,
    stage1: stage1Results,
    stage2: stage2Data,
    meta: {
      membersQueried: COUNCIL_MEMBERS.length,
      membersResponded: stage1Results.length,
      aggregateRankings: stage2Data.aggregated,
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseRanking(text) {
  const section = text.split('FINAL RANKING:')[1] ?? '';
  const matches = [...section.matchAll(/\d+\.\s*(Response [A-Z])/g)];
  return matches.map(m => m[1]);
}

function computeAggregateRankings(rankings, labelToMember) {
  const scores = {}; // memberId → [positions]

  for (const ranking of rankings) {
    const ordered = parseRanking(ranking.content);
    ordered.forEach((label, idx) => {
      const member = labelToMember[label];
      if (!member) return;
      if (!scores[member.id]) scores[member.id] = { label: member.label, positions: [] };
      scores[member.id].positions.push(idx + 1);
    });
  }

  return Object.values(scores)
    .map(({ label, positions }) => ({
      id: Object.keys(scores).find(k => scores[k].label === label),
      label,
      avgRank: positions.reduce((a, b) => a + b, 0) / positions.length,
      votes: positions.length,
    }))
    .sort((a, b) => a.avgRank - b.avgRank);
}

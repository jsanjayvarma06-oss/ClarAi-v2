/**
 * orchestrator.js
 * Works with intents from both the old form shape and the new chat intake shape.
 */

export function selectModel(intent) {
  const complexTypes = ['pitch_deck_content', 'business_plan', 'technical_analysis'];
  if (complexTypes.includes(intent.task_type) || intent.tone === 'professional') {
    return 'gpt-4o';
  }
  return 'gpt-4o-mini';
}

export function constructSystemPrompt(intent) {
  return `You are ClarAI, a clarity-first AI assistant.
Your goal is to satisfy the user's intent with a single, high-quality output.

INTENT:
${JSON.stringify(intent, null, 2)}

INSTRUCTIONS:
1. Act as an expert suited to the defined audience and tone.
2. Strictly follow the output_format or outputType.
3. Do NOT ask clarifying questions. Make the best assumption from context.
4. Do NOT verify or explain your reasoning unless asked.
5. Provide ONLY the final deliverable.

FORMATTING:
- Use Markdown for structure.
- Be concise if length is short.
- Be comprehensive if length is detailed or long.
`;
}

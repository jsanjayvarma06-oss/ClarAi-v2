/**
 * app/api/chat/route.js
 *
 * mode: "intake"
 *   Smart intake agent — reads conversation history, returns either
 *   { done: false, reply: "..." }  →  follow-up question
 *   { done: true,  intent: {...} } →  enough info, ready to generate
 *
 * mode: "generate"
 *   Runs single-model or full council based on `useCouncil` flag.
 *   Returns { success, data, councilMeta? }
 */

import { NextResponse } from 'next/server';
import { constructSystemPrompt } from '@/lib/orchestrator';
import { runCouncil } from '@/lib/council';
import { generateContent } from '@/lib/llm';

const INTAKE_SYSTEM = `You are ClarAI's intake agent — embedded in a cyberpunk terminal chat UI.

Your job: gather just enough context to execute the user's request perfectly, then signal you're ready.

RULES:
1. Ask ONE short, natural question at a time. No bullet lists, no forms.
2. You need to know: (a) exactly what they want created, (b) who it's for, (c) tone/style, (d) rough length.
3. If the user's first message already contains enough detail, skip questions and immediately return the JSON below.
4. After at most 3 exchanges you must commit — make reasonable assumptions for anything still unclear.
5. Never mention "intent", "JSON", "parameters", or "form fields" to the user.
6. Match the cyberpunk aesthetic — brief, sharp, no filler.

When ready, respond with ONLY this raw JSON (no markdown fences, no extra text):
{"done":true,"intent":{"primaryRequest":"full description of what to create","outputType":"text","audience":"who it's for","tone":"professional","length":"medium","additionalContext":"any extra detail"}}

Valid outputType values: text, email, code, summary, bullet_points, pitch, linkedin, tweet
Valid tone values: professional, casual, witty, technical, cyberpunk, enthusiastic
Valid length values: short, medium, long, detailed

If NOT ready yet, reply with just your follow-up question as plain text (no JSON).`;

export async function POST(request) {
  const body = await request.json();
  const { mode } = body;

  // ── INTAKE ────────────────────────────────────────────────────────────────
  if (mode === 'intake') {
    const { history } = body;
    const messages = history.map(m => ({ role: m.role, content: m.content }));

    let raw;
    try {
      raw = await callIntakeModel(messages);
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    const trimmed = raw.trim();
    // Detect done-JSON — look for the pattern robustly
    const jsonMatch = trimmed.match(/\{[\s\S]*"done"\s*:\s*true[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.done && parsed.intent) {
          return NextResponse.json({ done: true, intent: parsed.intent });
        }
      } catch (_) { /* fall through as plain reply */ }
    }

    return NextResponse.json({ done: false, reply: trimmed });
  }

  // ── GENERATE ──────────────────────────────────────────────────────────────
  if (mode === 'generate') {
    const { intent, useCouncil } = body;

    const systemPrompt = constructSystemPrompt(intent);
    const userMessage = intent.primaryRequest +
      (intent.additionalContext ? `\n\nAdditional context: ${intent.additionalContext}` : '');

    if (useCouncil) {
      try {
        const result = await runCouncil(systemPrompt, userMessage);
        return NextResponse.json({
          success: true,
          data: result.final.content,
          councilMeta: {
            membersQueried:    result.meta.membersQueried,
            membersResponded:  result.meta.membersResponded,
            aggregateRankings: result.meta.aggregateRankings,
            chairmanFailed:    result.final.chairmanFailed ?? false,
            fallbackMember:    result.final.fallbackMember ?? null,
            stage1Responses:   result.stage1.map(r => ({ label: r.label, content: r.content })),
          },
        });
      } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    // Single model
    try {
      const data = await generateContent('gpt-4o', systemPrompt, userMessage);
      return NextResponse.json({ success: true, data });
    } catch (err) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
}

async function callIntakeModel(messages) {
  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: INTAKE_SYSTEM }, ...messages],
        max_tokens: 400,
        temperature: 0.4,
      }),
    });

    if (!res.ok) throw new Error(`Groq error ${res.status}`);
    const data = await res.json();
    return data.choices[0].message.content;
  }

  // Fallback: existing llm.js (uses LOCAL / RAPIDAPI / PYTHON depending on env)
  const historyText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
  return await generateContent('gpt-4o-mini', INTAKE_SYSTEM, historyText);
}

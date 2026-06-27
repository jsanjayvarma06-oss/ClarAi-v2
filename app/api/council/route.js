/**
 * app/api/council/route.js
 * Council-powered generation endpoint.
 * Replaces the old /api/generate for council mode.
 *
 * POST body: same shape as /api/generate (ClarAIForm fields)
 * Response adds `councilMeta` with stage details for the UI.
 */

import { NextResponse } from 'next/server';
import { parseIntent } from '@/lib/intent';
import { constructSystemPrompt } from '@/lib/orchestrator';
import { runCouncil } from '@/lib/council';

export async function POST(request) {
  try {
    const body = await request.json();

    // 1. Intent parsing (reuse existing logic)
    const intent = parseIntent(body);

    // 2. Build system prompt (reuse existing logic)
    const systemPrompt = constructSystemPrompt(intent);
    const userMessage =
      intent.context +
      (intent.additional_context ? `\n\nAdditional Context: ${intent.additional_context}` : '');

    // 3. Run the council
    const councilResult = await runCouncil(systemPrompt, userMessage);

    return NextResponse.json({
      success: true,
      data: councilResult.final.content,
      councilMeta: {
        membersQueried:   councilResult.meta.membersQueried,
        membersResponded: councilResult.meta.membersResponded,
        aggregateRankings: councilResult.meta.aggregateRankings,
        chairmanFailed:   councilResult.final.chairmanFailed ?? false,
        fallbackMember:   councilResult.final.fallbackMember ?? null,
        stage1Responses:  councilResult.stage1.map(r => ({
          label:   r.label,
          content: r.content,
        })),
      },
      meta: {
        model_used:      'LLM Council (NVIDIA NIM + Groq)',
        intent_detected: intent.task_type,
      },
    });
  } catch (error) {
    console.error('[Council API Error]', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/analyseScreenshot
 *
 * Analyses a screenshot for safeguarding concerns using the Anthropic API.
 * Called by the Android app after capturing a screenshot.
 *
 * This endpoint ONLY performs AI analysis — it does not insert alerts or
 * upload screenshots. The Android app handles both of those independently.
 *
 * Request body (JSON):
 *   { base64: string, deviceId: string, homeId: string, childId: string }
 *
 * Responses:
 *   200 { flagged: boolean, reason: string }
 *   400 { error: "..." }  — missing fields
 *
 * On any AI/parse error: returns { flagged: false, reason: "Analysis unavailable" }
 * so the Android app is never blocked by a backend failure.
 */
export async function POST(request: Request) {
  // ── Parse and validate body ──────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { base64, deviceId, homeId, childId } = body as {
    base64?: string;
    deviceId?: string;
    homeId?: string;
    childId?: string;
  };

  if (!base64 || !deviceId || !homeId || !childId) {
    return NextResponse.json(
      { error: "base64, deviceId, homeId, and childId are all required" },
      { status: 400 }
    );
  }

  // ── Call Anthropic API ───────────────────────────────────────────────────────
  try {
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5-20251101",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: base64,
                },
              },
              {
                type: "text",
                text: 'Analyse this screenshot for safeguarding concerns. Look for: nudity or sexual content, grooming behaviour or suspicious adult-child communication, drug references or drug sales, self-harm content, or graphic violence. Respond only with a JSON object, no markdown, no explanation: { "flagged": boolean, "reason": string } — reason should be a short plain-English description of what was found, or "No concerns detected" if flagged is false.',
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text().catch(() => "(unreadable)");
      console.error("[analyseScreenshot] Anthropic API error:", anthropicResponse.status, errText);
      return NextResponse.json({ flagged: false, reason: "Analysis unavailable" });
    }

    const anthropicData = await anthropicResponse.json() as {
      content?: { type: string; text?: string }[];
    };

    const rawText = anthropicData.content?.find((b) => b.type === "text")?.text ?? "";

    // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    const result = JSON.parse(cleaned) as { flagged: boolean; reason: string };

    return NextResponse.json({ flagged: Boolean(result.flagged), reason: result.reason ?? "" });
  } catch (err) {
    console.error("[analyseScreenshot] error:", err);
    return NextResponse.json({ flagged: false, reason: "Analysis unavailable" });
  }
}

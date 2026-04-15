export function extractResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text;
  }

  const output = record.output;
  if (!Array.isArray(output)) return "";

  const lines: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === "string" && text.trim()) lines.push(text);
    }
  }

  return lines.join("\n").trim();
}

export function parseJsonFromText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // continue with fallback extraction
  }

  const match = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error("LLM 응답에서 JSON을 찾지 못했습니다.");
  return JSON.parse(match[1]);
}

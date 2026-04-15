import { NextResponse } from "next/server";

type MeaningRequest = {
  word: string;
  meanings: string[];
};

function extractResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text;
  }

  const output = record.output;
  if (!Array.isArray(output)) {
    return "";
  }

  const lines: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) {
      continue;
    }
    for (const part of content) {
      if (!part || typeof part !== "object") {
        continue;
      }
      const text = (part as Record<string, unknown>).text;
      if (typeof text === "string" && text.trim()) {
        lines.push(text);
      }
    }
  }

  return lines.join("\n").trim();
}

function parseJsonFromText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // handle fenced JSON output
  }

  const match = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/(\{[\s\S]*\})/);
  if (!match) {
    throw new Error("LLM 응답에서 JSON을 찾지 못했습니다.");
  }

  return JSON.parse(match[1]);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const documentText =
      typeof body.documentText === "string" ? body.documentText.trim() : "";
    const entries = Array.isArray(body.entries)
      ? (body.entries as MeaningRequest[])
      : [];

    if (!apiKey || !documentText || entries.length === 0) {
      return NextResponse.json(
        { error: "apiKey, documentText, entries는 필수입니다." },
        { status: 400 },
      );
    }

    const prompt = `다음 텍스트에서 단어의 특정 의미로 쓰인 예문만 찾아라.
반드시 JSON만 반환하고, 다른 설명은 금지한다.

반환 JSON 스키마:
{
  "results": [
    {
      "word": "string",
      "meanings": [
        {
          "meaning": "string",
          "examples": [
            {
              "english": "원문 영어 문장",
              "korean": "해당 문장의 한국어 해석"
            }
          ]
        }
      ]
    }
  ]
}

규칙:
1) 예문은 반드시 제공된 텍스트에 실제로 있는 문장만 사용.
2) 영어 문장이 없는 경우 examples는 빈 배열.
3) 과도한 추론 금지.

검색 대상 텍스트:
${documentText}

찾아야 할 단어와 의미:
${JSON.stringify(entries, null, 2)}`;

    const llmRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: prompt }],
          },
        ],
      }),
    });

    if (!llmRes.ok) {
      const errorText = await llmRes.text();
      return NextResponse.json(
        { error: `OpenAI API 오류: ${errorText}` },
        { status: llmRes.status },
      );
    }

    const llmJson = await llmRes.json();
    const responseText = extractResponseText(llmJson);
    const parsed = parseJsonFromText(responseText);

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

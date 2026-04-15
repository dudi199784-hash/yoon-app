import { NextResponse } from "next/server";
import { loadCorpus, saveCorpusFromZip } from "@/lib/server/corpus";

export const runtime = "nodejs";

export async function GET() {
  try {
    const corpus = await loadCorpus();
    if (!corpus) {
      return NextResponse.json({ exists: false });
    }
    return NextResponse.json({
      exists: true,
      createdAt: corpus.createdAt,
      totalFiles: corpus.totalFiles,
      totalSentences: corpus.totalSentences,
    });
  } catch (error) {
    console.error("[api/corpus][GET] error:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    const status = message.includes("환경 변수가 필요합니다") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const zip = formData.get("zip");
    if (!(zip instanceof File)) {
      return NextResponse.json({ error: "zip 파일이 필요합니다." }, { status: 400 });
    }
    if (!zip.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: ".zip 파일만 업로드 가능합니다." }, { status: 400 });
    }

    const corpus = await saveCorpusFromZip(zip);
    return NextResponse.json({
      message: "코퍼스 저장이 완료되었습니다.",
      createdAt: corpus.createdAt,
      totalFiles: corpus.totalFiles,
      totalSentences: corpus.totalSentences,
    });
  } catch (error) {
    console.error("[api/corpus][POST] error:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    const status = message.includes("환경 변수가 필요합니다") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

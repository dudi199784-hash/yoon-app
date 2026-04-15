"use client";

import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
});

function collectText(node: unknown, bag: string[]) {
  if (typeof node === "string") {
    const trimmed = node.trim();
    if (trimmed) {
      bag.push(trimmed);
    }
    return;
  }

  if (!node || typeof node !== "object") {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectText(item, bag);
    }
    return;
  }

  const record = node as Record<string, unknown>;
  for (const value of Object.values(record)) {
    collectText(value, bag);
  }
}

async function parseHwpxFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const sectionFiles = Object.keys(zip.files)
    .filter((key) => key.startsWith("Contents/section") && key.endsWith(".xml"))
    .sort();

  if (sectionFiles.length === 0) {
    throw new Error("HWPX 파일에서 본문(section XML)을 찾지 못했습니다.");
  }

  const chunks: string[] = [];
  for (const sectionPath of sectionFiles) {
    const xml = await zip.files[sectionPath].async("string");
    const parsed = xmlParser.parse(xml);
    collectText(parsed, chunks);
  }

  const normalized = chunks.join(" ").replace(/\s+/g, " ").trim();
  if (!normalized) {
    throw new Error("HWPX 파일에서 텍스트를 추출하지 못했습니다.");
  }
  return normalized;
}

export async function parseUploadedFile(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".txt")) {
    return (await file.text()).trim();
  }

  if (lowerName.endsWith(".hwpx")) {
    return parseHwpxFile(file);
  }

  if (lowerName.endsWith(".hwp")) {
    throw new Error(
      ".hwp 바이너리 포맷은 브라우저에서 안정적으로 파싱하기 어려워요. .hwpx 또는 .txt로 저장 후 업로드해 주세요.",
    );
  }

  throw new Error("지원하지 않는 파일 형식입니다. .hwpx 또는 .txt를 사용해 주세요.");
}

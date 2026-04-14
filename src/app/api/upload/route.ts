import { NextResponse } from "next/server";

const NVIDIA_OCR_API_KEY = process.env.NVIDIA_OCR_API_KEY || "";

// Soft per-document cap. Full SDSs typically run 20-40k chars; we allow headroom
// for longer technical specs while keeping any single document well inside the
// model's context budget. Anything above this gets SDS-section-aware truncation
// (or head+tail fallback for non-SDS documents).
const DOC_CHAR_CAP = 50000;

// SDS sections that drive permit triggers. Preserving these when we must cut:
//   1  — Identification (product name, supplier)
//   3  — Composition / hazardous ingredients (chemicals, CAS numbers)
//   8  — Exposure controls / PPE (permissible exposure limits, TAC signals)
//   9  — Physical/chemical properties (VOC content, flash point)
//   11 — Toxicological information (TAC signals, carcinogens)
//   15 — Regulatory information (CERCLA, SARA, Prop 65)
const SDS_CRITICAL_SECTIONS = [1, 3, 8, 9, 11, 15];

function looksLikeSDS(text: string): boolean {
  const head = text.slice(0, 6000).toLowerCase();
  return (
    /safety\s+data\s+sheet/.test(head) ||
    /\bsds\b/.test(head) ||
    /section\s+1\b[^\n]{0,40}identification/.test(head)
  );
}

/**
 * Walk an SDS text and return contiguous ranges for each numbered section (1-16).
 * Returns [] if the document doesn't have enough recognizable section headers.
 */
function findSDSSections(
  text: string
): { num: number; start: number; end: number }[] {
  // Matches "SECTION 3" or "Section 3:" or "3. COMPOSITION" at the start of a line.
  const headerRe = /(?:^|\n)[ \t]*(?:section\s+)?(\d{1,2})[\.\s:)]+\s*([A-Z][A-Z \/&()\-]{3,80})/gi;
  const hits: { num: number; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(text)) !== null) {
    const num = parseInt(m[1], 10);
    if (num >= 1 && num <= 16) {
      hits.push({ num, start: m.index });
    }
  }
  if (hits.length < 6) return []; // not structured enough
  const sections: { num: number; start: number; end: number }[] = [];
  for (let i = 0; i < hits.length; i++) {
    const cur = hits[i];
    const next = hits[i + 1];
    sections.push({ num: cur.num, start: cur.start, end: next ? next.start : text.length });
  }
  return sections;
}

/**
 * Enforce the per-document char cap. If the document fits, return unchanged.
 * Otherwise prefer SDS-section-aware truncation (keeping the sections that
 * matter for permits). Fall back to a head+tail slice so we at least keep the
 * product identification and the regulatory boilerplate at the end.
 */
function truncateDocumentText(text: string, cap: number = DOC_CHAR_CAP): string {
  if (text.length <= cap) return text;

  if (looksLikeSDS(text)) {
    const sections = findSDSSections(text);
    if (sections.length > 0) {
      const kept = sections.filter((s) => SDS_CRITICAL_SECTIONS.includes(s.num));
      if (kept.length > 0) {
        let preserved = kept
          .map((s) => text.slice(s.start, s.end).trim())
          .join("\n\n");
        const droppedNums = sections
          .filter((s) => !SDS_CRITICAL_SECTIONS.includes(s.num))
          .map((s) => s.num)
          .join(", ");
        const note = `\n\n[SDS truncated to critical sections ${SDS_CRITICAL_SECTIONS.join(", ")}. Sections ${droppedNums || "none"} dropped to fit ${cap}-char budget.]`;
        // If the preserved content is itself oversize, fall through to head+tail.
        if (preserved.length + note.length <= cap) {
          return preserved + note;
        }
        // Still too big — trim the largest section until it fits.
        const budget = cap - note.length;
        if (preserved.length > budget) {
          preserved = preserved.slice(0, budget - 40) + "\n[...section truncated...]";
        }
        return preserved + note;
      }
    }
  }

  // Fallback: 70% head + 30% tail so we keep both the intro and the closing
  // (which often has regulatory citations, signatures, approvals).
  const headSize = Math.floor(cap * 0.7);
  const tailSize = cap - headSize - 80;
  const dropped = text.length - headSize - tailSize;
  return (
    text.slice(0, headSize) +
    `\n\n[... ${dropped.toLocaleString()} chars truncated ...]\n\n` +
    text.slice(-tailSize)
  );
}

async function extractWithNvidiaOCR(buffer: Buffer, fileName: string): Promise<string> {
  if (!NVIDIA_OCR_API_KEY) {
    return "";
  }

  try {
    const base64 = buffer.toString("base64");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let response: Response;
    try {
      response = await fetch("https://ai.api.nvidia.com/v1/cv/nvidia/ocdrnet", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NVIDIA_OCR_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          image: base64,
          render_label: false,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error(`NVIDIA OCR error: ${response.status}`);
      return "";
    }

    const data = await response.json();
    // Extract text from OCR response
    if (data.text) return data.text;
    if (data.metadata?.text) return data.metadata.text;
    // Handle structured bounding box output
    if (data.object) {
      const texts = data.object
        .filter((obj: { label?: string }) => obj.label)
        .map((obj: { label: string }) => obj.label);
      return texts.join("\n");
    }
    return "";
  } catch (error) {
    console.error("NVIDIA OCR failed:", error);
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results: { name: string; text: string; pages?: number }[] = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".pdf")) {
        try {
          // pdf-parse v2.x is a class-based API from the mehmet-kozan fork.
          // new PDFParse({ data }) then .getText() — the old v1 function form
          // (await pdfParse(buffer)) throws TypeError on this package.
          const { PDFParse } = await import("pdf-parse");
          const parser = new PDFParse({ data: new Uint8Array(buffer) });
          const result = await parser.getText();
          await parser.destroy();

          let text = result.text?.trim() || "";
          const pageCount = result.total;

          // If pdf-parse returned very little text, the PDF is likely scanned — try NVIDIA OCR
          if (text.length < 100 && NVIDIA_OCR_API_KEY) {
            const ocrText = await extractWithNvidiaOCR(buffer, file.name);
            if (ocrText.length > text.length) {
              text = ocrText;
            }
          }

          if (text.length > 0) {
            results.push({
              name: file.name,
              text: truncateDocumentText(text),
              pages: pageCount,
            });
          } else {
            results.push({
              name: file.name,
              text: "[Could not parse PDF — file may be scanned/image-based]",
            });
          }
        } catch (err) {
          console.error(`pdf-parse failed for ${file.name}:`, err);
          // Fallback to NVIDIA OCR for problematic PDFs
          if (NVIDIA_OCR_API_KEY) {
            const ocrText = await extractWithNvidiaOCR(buffer, file.name);
            if (ocrText.length > 0) {
              results.push({ name: file.name, text: truncateDocumentText(ocrText) });
            } else {
              results.push({
                name: file.name,
                text: "[Could not parse PDF — file may be scanned/image-based]",
              });
            }
          } else {
            results.push({
              name: file.name,
              text: "[Could not parse PDF — file may be scanned/image-based]",
            });
          }
        }
      } else if (
        fileName.endsWith(".png") ||
        fileName.endsWith(".jpg") ||
        fileName.endsWith(".jpeg") ||
        fileName.endsWith(".tiff") ||
        fileName.endsWith(".bmp")
      ) {
        // Image files — use NVIDIA OCR
        if (NVIDIA_OCR_API_KEY) {
          const ocrText = await extractWithNvidiaOCR(buffer, file.name);
          if (ocrText.length > 0) {
            results.push({ name: file.name, text: truncateDocumentText(ocrText) });
          } else {
            results.push({
              name: file.name,
              text: "[Could not extract text from image. The image may not contain readable text.]",
            });
          }
        } else {
          results.push({
            name: file.name,
            text: "[Image OCR requires NVIDIA_OCR_API_KEY to be configured]",
          });
        }
      } else if (
        fileName.endsWith(".txt") ||
        fileName.endsWith(".md") ||
        fileName.endsWith(".csv") ||
        fileName.endsWith(".json")
      ) {
        const text = new TextDecoder().decode(buffer);
        results.push({
          name: file.name,
          text: truncateDocumentText(text),
        });
      } else if (fileName.endsWith(".doc") || fileName.endsWith(".docx")) {
        const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
        const cleaned = text.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
        if (cleaned.length > 50) {
          results.push({ name: file.name, text: truncateDocumentText(cleaned) });
        } else {
          results.push({
            name: file.name,
            text: "[Could not extract text from this document format. For best results, upload as PDF or TXT.]",
          });
        }
      } else {
        results.push({
          name: file.name,
          text: "[Unsupported file format. Supported: PDF, TXT, MD, CSV, JSON, PNG, JPG, TIFF, BMP]",
        });
      }
    }

    return NextResponse.json({ documents: results });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process uploaded files" },
      { status: 500 }
    );
  }
}

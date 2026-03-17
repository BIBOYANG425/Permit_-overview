import { NextResponse } from "next/server";

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pdfMod = await import("pdf-parse") as any;
          const pdfParse = pdfMod.default || pdfMod;
          const data = await pdfParse(buffer);
          results.push({
            name: file.name,
            text: data.text.slice(0, 15000), // Cap at 15k chars to stay within context
            pages: data.numpages,
          });
        } catch {
          results.push({
            name: file.name,
            text: "[Could not parse PDF — file may be scanned/image-based]",
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
          text: text.slice(0, 15000),
        });
      } else if (fileName.endsWith(".doc") || fileName.endsWith(".docx")) {
        // Basic extraction for doc files — just grab readable text
        const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
        const cleaned = text.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
        if (cleaned.length > 50) {
          results.push({ name: file.name, text: cleaned.slice(0, 15000) });
        } else {
          results.push({
            name: file.name,
            text: "[Could not extract text from this document format. For best results, upload as PDF or TXT.]",
          });
        }
      } else {
        results.push({
          name: file.name,
          text: "[Unsupported file format. Supported: PDF, TXT, MD, CSV, JSON]",
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

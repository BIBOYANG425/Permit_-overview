import { NextResponse } from "next/server";

const NVIDIA_OCR_API_KEY = process.env.NVIDIA_OCR_API_KEY || "";

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pdfMod = await import("pdf-parse") as any;
          const pdfParse = pdfMod.default || pdfMod;
          const data = await pdfParse(buffer);

          let text = data.text?.trim() || "";

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
              text: text.slice(0, 15000),
              pages: data.numpages,
            });
          } else {
            results.push({
              name: file.name,
              text: "[Could not parse PDF — file may be scanned/image-based]",
            });
          }
        } catch {
          // Fallback to NVIDIA OCR for problematic PDFs
          if (NVIDIA_OCR_API_KEY) {
            const ocrText = await extractWithNvidiaOCR(buffer, file.name);
            if (ocrText.length > 0) {
              results.push({ name: file.name, text: ocrText.slice(0, 15000) });
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
            results.push({ name: file.name, text: ocrText.slice(0, 15000) });
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
          text: text.slice(0, 15000),
        });
      } else if (fileName.endsWith(".doc") || fileName.endsWith(".docx")) {
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

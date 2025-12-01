import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface SlipOCRResult {
  amount: number | null;
  date: string | null; // ISO date string
  transactionId: string | null;
  rawText: string;
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractSlipData(buffer, file.type, file.name);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing slip OCR:", error);
    return NextResponse.json(
      { error: "Failed to process slip" },
      { status: 500 }
    );
  }
}

async function extractSlipData(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<SlipOCRResult> {
  console.log("\n========== SLIP OCR ==========");
  console.log("📄 File:", fileName);
  console.log("📋 MIME Type:", mimeType);

  // Handle PDF files
  if (mimeType === "application/pdf") {
    try {
      const pdfParse = require("pdf-parse");
      const pdfData = await pdfParse(fileBuffer);
      const extractedText = pdfData.text || "";

      if (extractedText.trim().length > 0) {
        console.log("✅ PDF text extracted!");
        return parseSlipText(extractedText);
      }
    } catch (error) {
      console.log("❌ PDF parse error:", error);
    }
    return emptyResult();
  }

  // Handle images with Google Vision API
  if (mimeType.startsWith("image/")) {
    return await processImageWithVision(fileBuffer);
  }

  return emptyResult();
}

async function processImageWithVision(
  imageBuffer: Buffer
): Promise<SlipOCRResult> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

  if (!apiKey) {
    console.log("❌ GOOGLE_CLOUD_API_KEY not set");
    return emptyResult();
  }

  try {
    const base64Image = imageBuffer.toString("base64");

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: "TEXT_DETECTION" }],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    const extractedText =
      data.responses?.[0]?.textAnnotations?.[0]?.description || "";

    if (!extractedText) {
      console.log("❌ No text detected in image");
      return emptyResult();
    }

    console.log("✅ Text extracted! Preview:\n", extractedText.substring(0, 500));
    return parseSlipText(extractedText);
  } catch (error) {
    console.log("❌ Vision API Error:", error);
    return emptyResult();
  }
}

function parseSlipText(text: string): SlipOCRResult {
  const result: SlipOCRResult = {
    amount: null,
    date: null,
    transactionId: null,
    rawText: text,
  };

  const lines = text.split("\n").map((l) => l.trim());

  // 1. EXTRACT AMOUNT
  // Look for patterns like "RM2,000.00", "RM 2,000.00", "MYR 2000"
  const amountPatterns = [
    /RM\s*([\d,]+\.?\d*)/i,
    /MYR\s*([\d,]+\.?\d*)/i,
    /Amount[:\s]*([\d,]+\.?\d*)/i,
    /Total[:\s]*(?:RM|MYR)?\s*([\d,]+\.?\d*)/i,
    /Order Amount[:\s]*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(amount) && amount > 0) {
        result.amount = amount;
        console.log("💰 Amount found:", amount);
        break;
      }
    }
  }

  // 2. EXTRACT DATE
  // Look for patterns like "27 Nov 2025", "27/11/2025", "2025-11-27"
  const datePatterns = [
    // "27 Nov 2025 12:37" or "27 Nov 2025"
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/i,
    // "27/11/2025" or "27-11-2025"
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    // "2025-11-27"
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    // Created Time: 27 Nov 2025
    /(?:Created|Date|Time)[:\s]*(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i,
  ];

  const monthMap: { [key: string]: number } = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      let date: Date | null = null;

      if (match[2] && isNaN(parseInt(match[2]))) {
        // Month name format: "27 Nov 2025"
        const day = parseInt(match[1]);
        const month = monthMap[match[2].toLowerCase()];
        const year = parseInt(match[3]);
        const hour = match[4] ? parseInt(match[4]) : 0;
        const minute = match[5] ? parseInt(match[5]) : 0;
        date = new Date(year, month, day, hour, minute);
      } else if (match[1].length === 4) {
        // ISO format: "2025-11-27"
        date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      } else {
        // DD/MM/YYYY format
        date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
      }

      if (date && !isNaN(date.getTime())) {
        result.date = date.toISOString().split("T")[0];
        console.log("📅 Date found:", result.date);
        break;
      }
    }
  }

  // 3. EXTRACT TRANSACTION ID
  // First try patterns where ID is on the same line
  const txPatterns = [
    /Transaction\s*ID[:\s]*(\S+)/i,
    /Reference[:\s]*(\S+)/i,
    /Ref\s*(?:No|#)?[:\s]*(\S+)/i,
    /Order\s*ID[:\s]*(\S+)/i,
  ];

  for (const pattern of txPatterns) {
    const match = text.match(pattern);
    if (match && match[1].length > 5 && match[1] !== "Transaction" && match[1] !== "Order") {
      result.transactionId = match[1];
      console.log("🔢 Transaction ID found (same line):", result.transactionId);
      break;
    }
  }

  // If not found, look for "Transaction ID" or "Order ID" label and get value from next line
  if (!result.transactionId) {
    const labelIndex = lines.findIndex(line => 
      /^Transaction\s*ID$/i.test(line) || /^Order\s*ID$/i.test(line)
    );
    
    if (labelIndex !== -1 && labelIndex + 1 < lines.length) {
      const nextLine = lines[labelIndex + 1];
      // Look for a long alphanumeric string (likely transaction ID)
      if (nextLine && nextLine.length >= 10 && /^[A-Z0-9]+$/i.test(nextLine)) {
        result.transactionId = nextLine;
        console.log("🔢 Transaction ID found (next line):", result.transactionId);
      }
    }
  }

  // Fallback: look for any long numeric string that could be a transaction ID
  if (!result.transactionId) {
    for (const line of lines) {
      if (/^\d{15,}$/.test(line)) {
        result.transactionId = line;
        console.log("🔢 Transaction ID found (numeric pattern):", result.transactionId);
        break;
      }
    }
  }

  console.log("========== RESULTS ==========");
  console.log("💰 Amount:", result.amount || "NOT FOUND");
  console.log("📅 Date:", result.date || "NOT FOUND");
  console.log("🔢 TX ID:", result.transactionId || "NOT FOUND");

  return result;
}

function emptyResult(): SlipOCRResult {
  return {
    amount: null,
    date: null,
    transactionId: null,
    rawText: "",
  };
}



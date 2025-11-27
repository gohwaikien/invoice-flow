// OCR Service for Invoice Data Extraction
// Supports: Images (Google Vision API), PDFs (converted to PNG then OCR)

interface OCRResult {
  invoiceNumber: string | null;
  invoiceDate: Date | null;
  recipientName: string | null;
  totalAmount: number | null;
  rawText: string;
}

export async function extractInvoiceData(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<OCRResult> {
  
  console.log("\n========== OCR PROCESSING ==========");
  console.log("📄 File:", fileName);
  console.log("📋 MIME Type:", mimeType);
  console.log("📦 Buffer Size:", fileBuffer.length, "bytes");

  // Handle PDF files - extract text using pdf-parse v1
  if (mimeType === "application/pdf") {
    console.log("📑 PDF detected - extracting text with pdf-parse...");
    try {
      const pdfParse = require('pdf-parse');
      
      // pdf-parse v1.1.1 accepts Buffer directly
      const pdfData = await pdfParse(fileBuffer);
      const extractedText = pdfData.text || "";
      
      if (extractedText.trim().length > 0) {
        console.log("✅ PDF text extracted! Length:", extractedText.length);
        console.log("📝 Preview:\n", extractedText.substring(0, 400));
        
        const result = parseInvoiceText(extractedText, fileName);
        
        console.log("\n========== RESULTS ==========");
        console.log("📋 Invoice #:", result.invoiceNumber || "NOT FOUND");
        console.log("👤 Recipient:", result.recipientName || "NOT FOUND");
        console.log("📅 Date:", result.invoiceDate?.toLocaleDateString() || "NOT FOUND");
        console.log("💰 Amount:", result.totalAmount ? `RM ${result.totalAmount.toLocaleString()}` : "NOT FOUND");
        console.log("==============================\n");
        
        return result;
      } else {
        console.log("⚠️ PDF has no extractable text (might be scanned)");
        return extractFromFileName(fileName);
      }
    } catch (error) {
      console.log("❌ PDF parse error:", error);
      return extractFromFileName(fileName);
    }
  }

  // Handle image files with Google Vision API
  if (mimeType.startsWith("image/")) {
    return await processImageWithVision(fileBuffer, fileName);
  }

  console.log("❌ Unsupported file type");
  return extractFromFileName(fileName);
}

// Process image buffer with Google Vision API
async function processImageWithVision(
  imageBuffer: Buffer,
  fileName: string
): Promise<OCRResult> {
  console.log("🖼️ Processing with Google Vision API...");
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  
  if (!apiKey) {
    console.log("❌ GOOGLE_CLOUD_API_KEY not set");
    return extractFromFileName(fileName);
  }

  try {
    const base64Image = imageBuffer.toString("base64");
    console.log("📤 Sending to Vision API...");
    
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Image },
            features: [{ type: "TEXT_DETECTION" }],
          }],
        }),
      }
    );

    console.log("📥 Response status:", response.status);
    const data = await response.json();
    
    if (data.error) {
      console.log("❌ API Error:", JSON.stringify(data.error));
      return extractFromFileName(fileName);
    }

    if (data.responses?.[0]?.error) {
      console.log("❌ Vision Error:", JSON.stringify(data.responses[0].error));
      return extractFromFileName(fileName);
    }

    const extractedText = data.responses?.[0]?.textAnnotations?.[0]?.description || "";
    
    if (!extractedText) {
      console.log("❌ No text detected in image");
      return extractFromFileName(fileName);
    }

    console.log("✅ Text extracted! Length:", extractedText.length);
    console.log("📝 Preview:\n", extractedText.substring(0, 400));
    
    const result = parseInvoiceText(extractedText, fileName);
    
    console.log("\n========== RESULTS ==========");
    console.log("📋 Invoice #:", result.invoiceNumber || "NOT FOUND");
    console.log("👤 Recipient:", result.recipientName || "NOT FOUND");
    console.log("📅 Date:", result.invoiceDate?.toLocaleDateString() || "NOT FOUND");
    console.log("💰 Amount:", result.totalAmount ? `RM ${result.totalAmount.toLocaleString()}` : "NOT FOUND");
    console.log("==============================\n");

    return result;

  } catch (error) {
    console.log("❌ Vision API Error:", error);
    return extractFromFileName(fileName);
  }
}

function extractFromFileName(fileName: string): OCRResult {
  console.log("📁 Extracting from filename:", fileName);
  
  const match = fileName.match(/([A-Z]{2,}-\d+)/i);
  const invoiceNumber = match ? match[1].toUpperCase() : fileName.replace(/\.[^/.]+$/, "");
  console.log("✓ Invoice #:", invoiceNumber);

  return {
    invoiceNumber,
    invoiceDate: null,
    recipientName: null,
    totalAmount: null,
    rawText: "",
  };
}

function parseInvoiceText(text: string, fileName: string): OCRResult {
  const result: OCRResult = {
    invoiceNumber: null,
    invoiceDate: null,
    recipientName: null,
    totalAmount: null,
    rawText: text,
  };

  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  // 1. INVOICE NUMBER
  const invPatterns = [
    /INVOICE\s*[:\s]+([A-Z0-9]+-\d+)/i,
    /([A-Z]{2,5}-\d{3,})/,
  ];
  for (const p of invPatterns) {
    const m = text.match(p);
    if (m) { result.invoiceNumber = m[1].toUpperCase(); break; }
  }
  if (!result.invoiceNumber) {
    const fm = fileName.match(/([A-Z]{2,}-\d+)/i);
    if (fm) result.invoiceNumber = fm[1].toUpperCase();
  }

  // 2. RECIPIENT NAME - Look for company names with business suffixes
  // Skip addresses (KAWASAN, JALAN, etc.)
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const line = lines[i];
    if (line.length < 5 || line.length > 60) continue;
    
    // Skip common non-recipient patterns
    if (/^(INVOICE|DATE|NO|TEL|FAX|EMAIL|PHONE|PAGE|REF|LOT|JALAN|Attn|Terms)/i.test(line)) continue;
    if (/GLOBAL\s*GOODS|TRADING\s*SOLUTION/i.test(line)) continue;
    if (/^\d|@/.test(line)) continue;
    // Skip address-related lines
    if (/KAWASAN|PERUSAHAAN|KUALA\s*LUMPUR|SELANGOR|PERAK|JOHOR|PENANG|KEDAH|KELANTAN/i.test(line)) continue;
    if (/^\d{5}\s/.test(line)) continue; // Postcode patterns like "52100 KUALA LUMPUR"
    
    // Match company names with business suffixes or all-caps names
    if (/SDN|BHD|ENTERPRISE|GEMILANG|PUSTAKA|INDUSTRIES|CORPORATION|COMPANY|PLT|RESOURCES|MARKETING/i.test(line)) {
      result.recipientName = line;
      break;
    }
    // All uppercase name that looks like a company (not an address)
    if (line === line.toUpperCase() && /^[A-Z][A-Z\s]+$/.test(line) && line.length >= 8 && line.length <= 40) {
      // Make sure it's not a personal name (usually 2-3 words) followed by business identifier
      if (!/^[A-Z]+\s+[A-Z]+\s+[A-Z]+$/.test(line) || line.split(/\s+/).length > 3) {
        result.recipientName = line;
        break;
      }
    }
  }

  // 3. DATE (DD/MM/YYYY)
  const dateMatch = text.match(/Date\s*[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i) ||
                    text.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/);
  if (dateMatch) {
    const parts = dateMatch[1].split(/[\/-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      let year = parseInt(parts[2]);
      if (year < 100) year += 2000;
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) result.invoiceDate = date;
    }
  }

  // 4. TOTAL AMOUNT
  const totalMatch = text.match(/Total\s*\(?\s*RM\s*\)?\s*[:\s]*([\d,]+\.?\d*)/i) ||
                     text.match(/Grand\s*Total[:\s]*(?:RM\s*)?([\d,]+\.?\d*)/i);
  if (totalMatch) {
    const amount = parseFloat(totalMatch[1].replace(/,/g, ""));
    if (!isNaN(amount) && amount > 0) result.totalAmount = amount;
  }
  
  // Fallback: largest amount
  if (!result.totalAmount) {
    const amounts: number[] = [];
    for (const m of text.matchAll(/([\d,]+\.\d{2})\b/g)) {
      const a = parseFloat(m[1].replace(/,/g, ""));
      if (!isNaN(a) && a > 100) amounts.push(a);
    }
    if (amounts.length > 0) result.totalAmount = Math.max(...amounts);
  }

  return result;
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractInvoiceData } from "@/lib/ocr";

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

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract invoice data via OCR
    const ocrData = await extractInvoiceData(buffer, file.type, file.name);

    return NextResponse.json({
      invoiceNumber: ocrData.invoiceNumber || "",
      recipientName: ocrData.recipientName || "",
      invoiceDate: ocrData.invoiceDate ? ocrData.invoiceDate.toISOString().split("T")[0] : "",
      totalAmount: ocrData.totalAmount || 0,
    });
  } catch (error) {
    console.error("OCR preview error:", error);
    return NextResponse.json(
      { error: "Failed to extract invoice data" },
      { status: 500 }
    );
  }
}


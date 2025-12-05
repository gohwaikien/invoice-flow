import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, generateFileKey } from "@/lib/storage";
import { extractInvoiceData } from "@/lib/ocr";

// POST - Attach/upload an invoice to an existing payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: paymentId } = await params;

  try {
    // Verify payment exists and belongs to user
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.paidById !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const invoiceNumber = formData.get("invoiceNumber") as string | null;
    const invoiceDate = formData.get("invoiceDate") as string | null;
    const recipientName = formData.get("recipientName") as string | null;
    const totalAmount = formData.get("totalAmount") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Upload file to storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileKey = generateFileKey("invoices", file.name);
    const fileUrl = await uploadFile(buffer, fileKey, file.type);

    // Run OCR if no data provided
    let ocrResult = null;
    if (!invoiceNumber && !totalAmount) {
      ocrResult = await extractInvoiceData(buffer, file.type, file.name);
    }

    const finalInvoiceNumber = invoiceNumber || ocrResult?.invoiceNumber || null;
    const finalTotalAmount = totalAmount
      ? parseFloat(totalAmount)
      : ocrResult?.totalAmount || payment.amount;

    // Check if invoice already exists with same invoice number and amount
    if (finalInvoiceNumber) {
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          invoiceNumber: finalInvoiceNumber,
          totalAmount: finalTotalAmount,
        },
      });

      if (existingInvoice) {
        // Link payment to existing invoice instead of creating duplicate
        await prisma.payment.update({
          where: { id: paymentId },
          data: { invoiceId: existingInvoice.id },
        });

        return NextResponse.json({
          success: true,
          invoice: existingInvoice,
          payment: { ...payment, invoiceId: existingInvoice.id },
          message: "Linked to existing invoice",
        });
      }
    }

    // Get user's company for the invoice
    const userWithCompany = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    // Create invoice and link to payment
    // Note: Supplier payments don't count towards settled amount (only settlements do)
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: finalInvoiceNumber,
        invoiceDate: invoiceDate
          ? new Date(invoiceDate)
          : ocrResult?.invoiceDate || null,
        recipientName: recipientName || ocrResult?.recipientName || null,
        totalAmount: finalTotalAmount,
        paidAmount: 0, // Payments from supplier don't count as settled
        status: "PENDING",
        fileUrl,
        fileName: file.name,
        uploaderId: session.user.id,
        recipientId: session.user.id, // The supplier who uploaded becomes the recipient
        companyId: userWithCompany?.companyId || payment.companyId || null, // Set company from user or payment
        ocrData: ocrResult ? JSON.parse(JSON.stringify(ocrResult)) : null,
      },
    });

    // Link payment to invoice
    await prisma.payment.update({
      where: { id: paymentId },
      data: { invoiceId: invoice.id },
    });

    return NextResponse.json({
      success: true,
      invoice,
      payment: { ...payment, invoiceId: invoice.id },
    });
  } catch (error) {
    console.error("Error attaching invoice:", error);
    return NextResponse.json(
      { error: "Failed to attach invoice" },
      { status: 500 }
    );
  }
}



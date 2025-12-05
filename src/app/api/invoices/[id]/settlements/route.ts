import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, generateFileKey } from "@/lib/storage";

// POST - Add a settlement (Business paying back supplier)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only BUSINESS or ADMIN can add settlements
  if (session.user.role !== "BUSINESS" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only business users can add settlements" },
      { status: 403 }
    );
  }

  const { id: invoiceId } = await params;

  try {
    // Check invoice exists and get linked payment
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    // Get linked payment separately
    const linkedPaymentRecord = await prisma.payment.findFirst({
      where: { invoiceId },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const linkedPayment = linkedPaymentRecord;

    const formData = await request.formData();
    const amount = parseFloat(formData.get("amount") as string);
    const notes = formData.get("notes") as string | null;
    const dateStr = formData.get("date") as string | null;
    const slip = formData.get("slip") as File | null;
    let transactionId = formData.get("transactionId") as string | null;

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid settlement amount" },
        { status: 400 }
      );
    }

    // Check for duplicate transaction ID (if provided)
    if (transactionId) {
      const existingSettlement = await prisma.settlement.findUnique({
        where: { transactionId },
      });

      if (existingSettlement) {
        return NextResponse.json(
          { 
            error: "Duplicate transaction", 
            message: `A settlement with transaction ID "${transactionId}" already exists.` 
          },
          { status: 409 }
        );
      }
    }

    // Process slip upload
    let slipUrl: string | null = null;
    let slipName: string | null = null;
    if (slip) {
      const buffer = Buffer.from(await slip.arrayBuffer());
      const fileKey = generateFileKey("slips", slip.name);
      slipUrl = await uploadFile(buffer, fileKey, slip.type);
      slipName = slip.name;
    }

    // Parse date or use current date
    const settlementDate = dateStr ? new Date(dateStr) : new Date();

    // Create settlement
    const settlement = await prisma.settlement.create({
      data: {
        amount,
        notes,
        date: settlementDate,
        slipUrl,
        slipName,
        transactionId,
        invoiceId,
        settledById: session.user.id,
      },
      include: {
        settledBy: {
          select: { name: true, email: true },
        },
      },
    });

    // Update invoice paid amount and status
    const newPaidAmount = invoice.paidAmount + amount;
    let newStatus = invoice.status;

    if (newPaidAmount >= invoice.totalAmount) {
      newStatus = "COMPLETED";
    } else if (newPaidAmount > 0) {
      newStatus = "PARTIAL";
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    // Also update the linked payment's settledAmount if exists
    if (linkedPayment) {
      const currentSettled = (linkedPayment as { settledAmount?: number }).settledAmount || 0;
      await prisma.payment.update({
        where: { id: linkedPayment.id },
        data: {
          settledAmount: currentSettled + amount,
        } as any,
      });
    }

    return NextResponse.json(settlement, { status: 201 });
  } catch (error) {
    console.error("Error creating settlement:", error);
    return NextResponse.json(
      { error: "Failed to create settlement" },
      { status: 500 }
    );
  }
}

// GET - Get settlements for an invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: invoiceId } = await params;

  try {
    const settlements = await prisma.settlement.findMany({
      where: { invoiceId },
      include: {
        settledBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(settlements);
  } catch (error) {
    console.error("Error fetching settlements:", error);
    return NextResponse.json(
      { error: "Failed to fetch settlements" },
      { status: 500 }
    );
  }
}


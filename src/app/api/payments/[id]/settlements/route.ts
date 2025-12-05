import { NextRequest, NextResponse } from "next/server";
import { auth, hasAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, generateFileKey } from "@/lib/storage";

// POST - Add a settlement directly to a payment (even without invoice)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only BUSINESS or ADMIN can add settlements
  if (!hasAnyRole(session.user, ["BUSINESS", "ADMIN"])) {
    return NextResponse.json(
      { error: "Only business users can add settlements" },
      { status: 403 }
    );
  }

  const { id: paymentId } = await params;

  try {
    // Check payment exists
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

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

    // Create settlement linked to payment
    const settlement = await prisma.settlement.create({
      data: {
        amount,
        notes,
        date: settlementDate,
        slipUrl,
        slipName,
        transactionId,
        paymentId,
        // If payment has an invoice, also link settlement to invoice
        invoiceId: payment.invoiceId,
        settledById: session.user.id,
      },
      include: {
        settledBy: {
          select: { name: true, email: true },
        },
      },
    });

    // Update payment's settled amount
    const newSettledAmount = payment.settledAmount + amount;
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        settledAmount: newSettledAmount,
      },
    });

    // If payment has an invoice, also update invoice's paidAmount
    if (payment.invoice) {
      const newPaidAmount = payment.invoice.paidAmount + amount;
      let newStatus = payment.invoice.status;

      if (newPaidAmount >= payment.invoice.totalAmount) {
        newStatus = "COMPLETED";
      } else if (newPaidAmount > 0) {
        newStatus = "PARTIAL";
      }

      await prisma.invoice.update({
        where: { id: payment.invoiceId! },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
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

// GET - Get settlements for a payment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: paymentId } = await params;

  try {
    const settlements = await prisma.settlement.findMany({
      where: { paymentId },
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


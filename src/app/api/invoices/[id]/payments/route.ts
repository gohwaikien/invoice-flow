import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToS3, generateFileKey } from "@/lib/s3";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "BUSINESS") {
    return NextResponse.json(
      { error: "Only business users can add payments" },
      { status: 403 }
    );
  }

  const { id: invoiceId } = await params;

  try {
    // Check invoice exists and user has access
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.recipientId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only add payments to invoices assigned to you" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const amount = parseFloat(formData.get("amount") as string);
    const notes = formData.get("notes") as string | null;
    const slip = formData.get("slip") as File | null;

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    // Upload payment slip if provided
    let slipUrl: string | null = null;
    let slipName: string | null = null;
    if (slip) {
      const buffer = Buffer.from(await slip.arrayBuffer());
      slipUrl = generateFileKey("slips", slip.name);
      slipName = slip.name;
      await uploadToS3(buffer, slipUrl, slip.type);
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        amount,
        notes,
        slipUrl,
        slipName,
        invoiceId,
        paidById: session.user.id,
      },
      include: {
        paidBy: {
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

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}


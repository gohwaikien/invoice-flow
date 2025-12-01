import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, generateFileKey } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Allow BUSINESS or ADMIN users to add payments
  if (session.user.role !== "BUSINESS" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only business users can add payments" },
      { status: 403 }
    );
  }

  const { id: invoiceId } = await params;

  try {
    // Check invoice exists
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Business and Admin can add payments to any invoice

    const formData = await request.formData();
    const amount = parseFloat(formData.get("amount") as string);
    const notes = formData.get("notes") as string | null;
    const dateStr = formData.get("date") as string | null;
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
      const fileKey = generateFileKey("slips", slip.name);
      slipUrl = await uploadFile(buffer, fileKey, slip.type);
      slipName = slip.name;
    }

    // Parse date or use current date
    const paymentDate = dateStr ? new Date(dateStr) : new Date();

    // Create payment
    // Note: Payments are when suppliers pay on behalf of the business
    // This increases what the business owes the supplier
    // It does NOT reduce the invoice balance (only settlements do that)
    const payment = await prisma.payment.create({
      data: {
        amount,
        notes,
        date: paymentDate,
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

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// DELETE - Delete a payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);

  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verify payment exists and belongs to user
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.paidById !== authResult.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete the payment
    // Note: Payments don't affect invoice paidAmount (only settlements do)
    await prisma.payment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}

// PUT - Update a payment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);

  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { amount, notes, date, invoiceId } = body;

    // Verify payment exists and belongs to user
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.paidById !== authResult.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const newAmount = amount !== undefined ? parseFloat(amount) : payment.amount;

    // Update payment
    // Note: Payments don't affect invoice paidAmount (only settlements do)
    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        amount: newAmount,
        notes: notes !== undefined ? notes : payment.notes,
        date: date ? new Date(date) : payment.date,
        invoiceId: invoiceId !== undefined ? invoiceId : payment.invoiceId,
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            fileName: true,
            fileUrl: true,
            totalAmount: true,
          },
        },
        paidBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updatedPayment);
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}

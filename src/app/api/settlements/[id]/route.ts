import { NextRequest, NextResponse } from "next/server";
import { auth, hasAnyRole, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT - Update a settlement
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only BUSINESS or ADMIN can update settlements
  if (!hasAnyRole(session.user, ["BUSINESS", "ADMIN"])) {
    return NextResponse.json(
      { error: "Only business users can update settlements" },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { amount, date, notes, transactionId } = body;

    // Find settlement and related invoice/payment
    const settlement = await prisma.settlement.findUnique({
      where: { id },
      include: { invoice: true, payment: true },
    });

    if (!settlement) {
      return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
    }

    // Only allow update by the user who created it (or admin)
    if (settlement.settledById !== session.user.id && !hasRole(session.user, "ADMIN")) {
      return NextResponse.json(
        { error: "You can only update your own settlements" },
        { status: 403 }
      );
    }

    const newAmount = parseFloat(amount);
    if (isNaN(newAmount) || newAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Check for duplicate transaction ID (if changed)
    if (transactionId && transactionId !== settlement.transactionId) {
      const existingSettlement = await prisma.settlement.findFirst({
        where: {
          transactionId,
          id: { not: id },
        },
      });
      if (existingSettlement) {
        return NextResponse.json(
          { error: "A settlement with this transaction ID already exists" },
          { status: 409 }
        );
      }
    }

    const amountDifference = newAmount - settlement.amount;
    const updateOperations = [];

    // Update the settlement
    updateOperations.push(
      prisma.settlement.update({
        where: { id },
        data: {
          amount: newAmount,
          date: date ? new Date(date) : settlement.date,
          notes: notes ?? settlement.notes,
          transactionId: transactionId ?? settlement.transactionId,
        },
      })
    );

    // Update invoice paid amount and status if linked to invoice
    if (settlement.invoice && amountDifference !== 0) {
      const newPaidAmount = Math.max(0, settlement.invoice.paidAmount + amountDifference);
      let newStatus: "PENDING" | "PARTIAL" | "COMPLETED" = "PENDING";

      if (newPaidAmount >= settlement.invoice.totalAmount) {
        newStatus = "COMPLETED";
      } else if (newPaidAmount > 0) {
        newStatus = "PARTIAL";
      }

      updateOperations.push(
        prisma.invoice.update({
          where: { id: settlement.invoiceId! },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
          },
        })
      );
    }

    // Update payment's settled amount if linked to payment
    if (settlement.payment && amountDifference !== 0) {
      const newSettledAmount = Math.max(0, settlement.payment.settledAmount + amountDifference);
      updateOperations.push(
        prisma.payment.update({
          where: { id: settlement.paymentId! },
          data: {
            settledAmount: newSettledAmount,
          },
        })
      );
    }

    await prisma.$transaction(updateOperations);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating settlement:", error);
    return NextResponse.json(
      { error: "Failed to update settlement" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a settlement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only BUSINESS or ADMIN can delete settlements
  if (!hasAnyRole(session.user, ["BUSINESS", "ADMIN"])) {
    return NextResponse.json(
      { error: "Only business users can delete settlements" },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    // Find settlement and related invoice/payment
    const settlement = await prisma.settlement.findUnique({
      where: { id },
      include: { invoice: true, payment: true },
    });

    if (!settlement) {
      return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
    }

    // Only allow deletion by the user who created it (or admin)
    if (settlement.settledById !== session.user.id && !hasRole(session.user, "ADMIN")) {
      return NextResponse.json(
        { error: "You can only delete your own settlements" },
        { status: 403 }
      );
    }

    // Delete settlement first
    await prisma.settlement.delete({
      where: { id },
    });

    // Update invoice paid amount and status if linked to invoice
    if (settlement.invoice) {
      const newPaidAmount = Math.max(0, settlement.invoice.paidAmount - settlement.amount);
      let newStatus: "PENDING" | "PARTIAL" | "COMPLETED" = "PENDING";

      if (newPaidAmount >= settlement.invoice.totalAmount) {
        newStatus = "COMPLETED";
      } else if (newPaidAmount > 0) {
        newStatus = "PARTIAL";
      }

      await prisma.invoice.update({
        where: { id: settlement.invoiceId! },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });
    }

    // Update payment's settled amount if linked to payment
    if (settlement.payment) {
      const newSettledAmount = Math.max(0, settlement.payment.settledAmount - settlement.amount);
      await prisma.payment.update({
        where: { id: settlement.paymentId! },
        data: {
          settledAmount: newSettledAmount,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting settlement:", error);
    return NextResponse.json(
      { error: "Failed to delete settlement" },
      { status: 500 }
    );
  }
}



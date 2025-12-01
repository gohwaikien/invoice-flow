import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  if (session.user.role !== "BUSINESS" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only business users can delete settlements" },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    // Find settlement and related invoice
    const settlement = await prisma.settlement.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!settlement) {
      return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
    }

    // Only allow deletion by the user who created it (or admin)
    if (settlement.settledById !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "You can only delete your own settlements" },
        { status: 403 }
      );
    }

    // Update invoice paid amount and status
    const newPaidAmount = Math.max(0, settlement.invoice.paidAmount - settlement.amount);
    let newStatus: "PENDING" | "PARTIAL" | "COMPLETED" = "PENDING";

    if (newPaidAmount >= settlement.invoice.totalAmount) {
      newStatus = "COMPLETED";
    } else if (newPaidAmount > 0) {
      newStatus = "PARTIAL";
    }

    // Delete settlement and update invoice in a transaction
    await prisma.$transaction([
      prisma.settlement.delete({
        where: { id },
      }),
      prisma.invoice.update({
        where: { id: settlement.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting settlement:", error);
    return NextResponse.json(
      { error: "Failed to delete settlement" },
      { status: 500 }
    );
  }
}



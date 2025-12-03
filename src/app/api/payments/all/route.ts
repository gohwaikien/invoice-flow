import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Fetch all payments (for business users to see and settle)
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only BUSINESS or ADMIN can see all payments
  if (session.user.role !== "BUSINESS" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only business users can view all payments" },
      { status: 403 }
    );
  }

  try {
    const payments = await prisma.payment.findMany({
      select: {
        id: true,
        amount: true,
        date: true,
        notes: true,
        invoiceId: true,
        settledAmount: true,
        createdAt: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            fileName: true,
            fileUrl: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
          },
        },
        settlements: {
          select: {
            id: true,
            amount: true,
            date: true,
            slipUrl: true,
            slipName: true,
            notes: true,
            transactionId: true,
            settledBy: {
              select: { name: true, email: true },
            },
          },
          orderBy: { date: "desc" },
        },
        paidBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching all payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}


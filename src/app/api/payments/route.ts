import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET - Fetch payments (for supplier: their recorded payments)
export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);

  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // "unlinked" = no invoice attached

    const where: any = {
      paidById: authResult.userId,
    };

    if (status === "unlinked") {
      where.invoiceId = null;
    } else if (status === "linked") {
      where.invoiceId = { not: null };
    }

    const payments = await prisma.payment.findMany({
      where,
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
          },
        },
        // Direct settlements on payment (when no invoice)
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST - Create a new payment (supplier records a payment)
export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);

  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { amount, notes, date } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Amount is required and must be positive" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        amount: parseFloat(amount),
        notes: notes || null,
        date: date ? new Date(date) : new Date(),
        paidById: authResult.userId,
      },
      include: {
        paidBy: {
          select: {
            name: true,
            email: true,
          },
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

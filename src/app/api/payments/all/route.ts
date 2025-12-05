import { NextRequest, NextResponse } from "next/server";
import { auth, hasAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Fetch all payments (for business users to see and settle)
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRoles = session.user.roles || [];
  const isAdmin = userRoles.includes("ADMIN");
  const isBusiness = userRoles.includes("BUSINESS");

  // Only BUSINESS or ADMIN can see all payments
  if (!isBusiness && !isAdmin) {
    return NextResponse.json(
      { error: "Only business users can view all payments" },
      { status: 403 }
    );
  }

  try {
    // Get accessible supplier company IDs for business users
    let accessibleCompanyIds: string[] | null = null;

    if (isBusiness && !isAdmin) {
      // Get user's company
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true },
      });

      if (user?.companyId) {
        // Get supplier companies this business has access to
        const accessRecords = await prisma.businessAccess.findMany({
          where: { businessCompanyId: user.companyId },
          select: { supplierCompanyId: true },
        });
        accessibleCompanyIds = accessRecords.map((a) => a.supplierCompanyId);
      }
    }
    // ADMIN sees all - accessibleCompanyIds stays null

    const where: any = {};
    if (accessibleCompanyIds !== null) {
      where.companyId = { in: accessibleCompanyIds };
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
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            fileName: true,
            fileUrl: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
            recipientName: true,
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


import { NextRequest, NextResponse } from "next/server";
import { auth, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get company details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRole(session.user, "ADMIN")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: true,
          },
        },
        _count: {
          select: {
            payments: true,
            invoices: true,
          },
        },
        supplierAccess: {
          include: {
            businessCompany: {
              select: { id: true, name: true },
            },
          },
        },
        businessAccess: {
          include: {
            supplierCompany: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}

// PATCH - Update company
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRole(session.user, "ADMIN")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name } = body;

  try {
    const company = await prisma.company.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    );
  }
}

// DELETE - Delete company
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRole(session.user, "ADMIN")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Check if company has data
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: { payments: true, invoices: true, users: true },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (company._count.payments > 0 || company._count.invoices > 0) {
      return NextResponse.json(
        { error: "Cannot delete company with existing payments or invoices" },
        { status: 400 }
      );
    }

    await prisma.company.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 }
    );
  }
}


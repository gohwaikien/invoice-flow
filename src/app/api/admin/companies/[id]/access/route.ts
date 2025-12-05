import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST - Grant business access to a supplier
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id: companyId } = await params;
  const body = await request.json();
  const { supplierCompanyId, businessCompanyId } = body;

  try {
    // Get the company being configured
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    let accessData: { businessCompanyId: string; supplierCompanyId: string };

    if (company.type === "BUSINESS") {
      // Granting this business access to a supplier
      if (!supplierCompanyId) {
        return NextResponse.json(
          { error: "Supplier company ID is required" },
          { status: 400 }
        );
      }

      // Verify supplier company exists and is a supplier
      const supplierCompany = await prisma.company.findUnique({
        where: { id: supplierCompanyId },
      });

      if (!supplierCompany || supplierCompany.type !== "SUPPLIER") {
        return NextResponse.json(
          { error: "Invalid supplier company" },
          { status: 400 }
        );
      }

      accessData = {
        businessCompanyId: companyId,
        supplierCompanyId,
      };
    } else {
      // Granting a business access to this supplier
      if (!businessCompanyId) {
        return NextResponse.json(
          { error: "Business company ID is required" },
          { status: 400 }
        );
      }

      // Verify business company exists and is a business
      const businessCompany = await prisma.company.findUnique({
        where: { id: businessCompanyId },
      });

      if (!businessCompany || businessCompany.type !== "BUSINESS") {
        return NextResponse.json(
          { error: "Invalid business company" },
          { status: 400 }
        );
      }

      accessData = {
        businessCompanyId,
        supplierCompanyId: companyId,
      };
    }

    // Create the access record
    const access = await prisma.businessAccess.upsert({
      where: {
        businessCompanyId_supplierCompanyId: accessData,
      },
      update: {},
      create: accessData,
      include: {
        businessCompany: { select: { id: true, name: true } },
        supplierCompany: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(access, { status: 201 });
  } catch (error) {
    console.error("Error granting access:", error);
    return NextResponse.json(
      { error: "Failed to grant access" },
      { status: 500 }
    );
  }
}

// DELETE - Revoke business access to a supplier
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const accessId = searchParams.get("accessId");

  if (!accessId) {
    return NextResponse.json({ error: "Access ID is required" }, { status: 400 });
  }

  try {
    // Verify the access record exists and is related to this company
    const access = await prisma.businessAccess.findUnique({
      where: { id: accessId },
    });

    if (!access) {
      return NextResponse.json({ error: "Access not found" }, { status: 404 });
    }

    if (access.businessCompanyId !== companyId && access.supplierCompanyId !== companyId) {
      return NextResponse.json(
        { error: "Access not related to this company" },
        { status: 403 }
      );
    }

    await prisma.businessAccess.delete({
      where: { id: accessId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking access:", error);
    return NextResponse.json(
      { error: "Failed to revoke access" },
      { status: 500 }
    );
  }
}


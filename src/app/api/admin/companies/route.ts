import { NextRequest, NextResponse } from "next/server";
import { auth, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List all companies
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRole(session.user, "ADMIN")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: {
            users: true,
            payments: true,
            invoices: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: true,
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
      orderBy: { name: "asc" },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

// POST - Create a new company
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRole(session.user, "ADMIN")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, type } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    if (type !== "SUPPLIER" && type !== "BUSINESS") {
      return NextResponse.json(
        { error: "Type must be SUPPLIER or BUSINESS" },
        { status: 400 }
      );
    }

    const company = await prisma.company.create({
      data: {
        name,
        type,
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}


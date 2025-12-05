import { NextRequest, NextResponse } from "next/server";
import { auth, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST - Add user to company
export async function POST(
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

  const { id: companyId } = await params;
  const body = await request.json();
  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    // Check company exists and get its type
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, roles: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user's company and add company type role if not already present
    const newRoles = user.roles.includes(company.type)
      ? user.roles
      : [...user.roles, company.type];

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        companyId,
        roles: newRoles,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        roles: updatedUser.roles,
      },
    });
  } catch (error) {
    console.error("Error adding user to company:", error);
    return NextResponse.json(
      { error: "Failed to add user to company" },
      { status: 500 }
    );
  }
}

// DELETE - Remove user from company
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

  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    // Check user belongs to this company
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== companyId) {
      return NextResponse.json(
        { error: "User not found in this company" },
        { status: 404 }
      );
    }

    // Remove user from company
    await prisma.user.update({
      where: { id: userId },
      data: {
        companyId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing user from company:", error);
    return NextResponse.json(
      { error: "Failed to remove user from company" },
      { status: 500 }
    );
  }
}


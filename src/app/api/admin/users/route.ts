import { NextRequest, NextResponse } from "next/server";
import { auth, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all users (admin only)
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true },
  });

  if (!currentUser?.roles?.includes("ADMIN")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        roles: true,
        companyId: true,
        createdAt: true,
        _count: {
          select: {
            uploadedInvoices: true,
            receivedInvoices: true,
            payments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// PATCH update user roles (admin only)
export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true },
  });

  if (!currentUser?.roles?.includes("ADMIN")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, roles, action, role } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Support both new format (roles array) and legacy format (single role with action)
    let newRoles: string[];

    if (roles) {
      // New format: directly set roles array
      newRoles = roles.filter((r: string) => ["ADMIN", "SUPPLIER", "BUSINESS"].includes(r));
    } else if (role && action) {
      // Legacy format: add or remove a single role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { roles: true },
      });
      const currentRoles = user?.roles || [];

      if (action === "add") {
        newRoles = [...new Set([...currentRoles, role])];
      } else if (action === "remove") {
        newRoles = currentRoles.filter((r) => r !== role);
      } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
    } else if (role) {
      // Simple toggle: if has role, remove it; if doesn't have, add it
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { roles: true },
      });
      const currentRoles = user?.roles || [];

      if (currentRoles.includes(role)) {
        newRoles = currentRoles.filter((r) => r !== role);
      } else {
        newRoles = [...currentRoles, role];
      }
    } else {
      return NextResponse.json(
        { error: "roles array or role is required" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { roles: newRoles },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user roles:", error);
    return NextResponse.json(
      { error: "Failed to update user roles" },
      { status: 500 }
    );
  }
}


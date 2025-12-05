import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { role } = await request.json();

    if (!["SUPPLIER", "BUSINESS"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if user already has roles
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.roles && user.roles.length > 0) {
      return NextResponse.json(
        { error: "Roles already set. Contact admin to change." },
        { status: 400 }
      );
    }

    // Set the initial role in the roles array
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { roles: [role] },
    });

    return NextResponse.json({
      success: true,
      roles: updatedUser.roles,
    });
  } catch (error) {
    console.error("Error setting role:", error);
    return NextResponse.json(
      { error: "Failed to set role" },
      { status: 500 }
    );
  }
}


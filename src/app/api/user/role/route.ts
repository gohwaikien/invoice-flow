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

    // Check if user already has a role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.role) {
      return NextResponse.json(
        { error: "Role already set. Contact admin to change." },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { role },
    });

    return NextResponse.json({
      success: true,
      role: updatedUser.role,
    });
  } catch (error) {
    console.error("Error setting role:", error);
    return NextResponse.json(
      { error: "Failed to set role" },
      { status: 500 }
    );
  }
}


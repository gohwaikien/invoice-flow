import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// TEMPORARY ENDPOINT - Delete after use
// This endpoint makes the currently logged-in user an admin
export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  // Only allow specific email to become admin (security measure)
  const allowedEmails = ["gohwaikien@gmail.com"];
  
  if (!allowedEmails.includes(session.user.email || "")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        role: "ADMIN",
        roles: ["ADMIN"],
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${updatedUser.email} is now an admin`,
      roles: updatedUser.roles,
    });
  } catch (error) {
    console.error("Error setting admin:", error);
    return NextResponse.json({ error: "Failed to set admin" }, { status: 500 });
  }
}


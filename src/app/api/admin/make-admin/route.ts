import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Temporary endpoint to make gohwaikien@gmail.com an admin
// DELETE THIS FILE AFTER USE
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only allow the specific user to make themselves admin
  if (session.user.email !== "gohwaikien@gmail.com") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { email: "gohwaikien@gmail.com" },
      data: { 
        role: "ADMIN",
        roles: ["ADMIN", "SUPPLIER", "BUSINESS"], // Give all roles
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "You are now an admin with all roles!",
      roles: updatedUser.roles,
    });
  } catch (error) {
    console.error("Error making admin:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}


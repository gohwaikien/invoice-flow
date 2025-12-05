import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboard } from "./AdminDashboard";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Check if user has admin role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true },
  });

  if (!user?.roles?.includes("ADMIN")) {
    redirect("/dashboard");
  }

  return <AdminDashboard session={session} />;
}


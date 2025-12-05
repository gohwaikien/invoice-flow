import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  // Check if user has at least one role
  if (!session.user.roles || session.user.roles.length === 0) {
    redirect("/onboarding");
  }

  return <DashboardClient session={session} />;
}


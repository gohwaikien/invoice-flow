import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ApiDocsClient } from "./ApiDocsClient";

export default async function ApiDocsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return <ApiDocsClient />;
}



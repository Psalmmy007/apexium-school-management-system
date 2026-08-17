import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { TeachersClient } from "./TeachersClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Teaching Staff & Class Assignments — Admin",
};

export default async function TeachersPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    redirect("/auth/login");
  }

  return <TeachersClient />;
}

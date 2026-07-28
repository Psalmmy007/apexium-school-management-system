import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import type { Metadata } from "next";
import { DashboardShell } from "@/components/DashboardShell";

export const metadata: Metadata = {
  title: "Dashboard — Apexium ERP",
  description: "Your school management dashboard",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <DashboardShell user={{ firstName: user.firstName, lastName: user.lastName, role: user.role }}>
      {children}
    </DashboardShell>
  );
}

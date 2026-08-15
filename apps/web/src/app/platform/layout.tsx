import { redirect } from "next/navigation";
import { getSessionUser, verifyPlatformOperator } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/platform");
  }

  const isOperator = await verifyPlatformOperator(user);

  if (!isOperator || user.role !== "platform_operator") {
    // School admins and other non-platform operators are strictly forbidden from platform-level routes
    redirect("/dashboard?error=unauthorized_platform_operator_required");
  }

  return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
}

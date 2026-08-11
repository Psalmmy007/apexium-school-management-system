import React from "react";
import GroupDashboardClient from "./GroupDashboardClient";

export const metadata = {
  title: "Multi-Branch School Group Dashboard | Apexium ERP",
  description: "Manage multi-campus school groups, view aggregated metrics, and provision branch schools.",
};

export default function GroupDashboardPage() {
  return <GroupDashboardClient />;
}

import React from "react";
import DataExportClient from "./DataExportClient";

export const metadata = {
  title: "Data Portability & Self-Service Export | Apexium ERP",
  description: "Request and download complete self-service data exports of your school's records.",
};

export default function DataExportPage() {
  return <DataExportClient />;
}

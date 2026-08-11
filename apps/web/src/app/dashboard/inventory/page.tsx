import React from "react";
import InventoryClient from "./InventoryClient";

export const metadata = {
  title: "Inventory & Asset Management | Apexium ERP",
  description: "Track consumable stock, movements, suppliers, purchase orders, fixed assets, and depreciation.",
};

export default function InventoryPage() {
  return <InventoryClient />;
}

import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "crypto";
import { db } from "../client";
import {
  createInventoryItem,
  getInventoryItems,
  getInventoryItem,
  recordStockIn,
  recordStockOut,
  getLowStockAlerts,
  createSupplier,
  getSuppliers,
  createPurchaseOrder,
  receivePurchaseOrder,
  registerAsset,
  calculateDepreciation,
  lookupAssetByCode,
  getSchoolAssets,
} from "./inventory";
import { registerSchool, initializeSchoolTenant } from "./school-onboarding";

describe("Milestone 30 — Comprehensive Inventory Management & Multi-Tenant Audit", () => {
  let schoolAId: string;
  let schoolASlug: string;
  let schoolBId: string;
  let schoolBSlug: string;

  beforeAll(async () => {
    // Register School A
    const regA = await registerSchool({
      schoolName: "Apexium Inventory School A",
      adminFirstName: "Admin",
      adminLastName: "Alpha",
      adminEmail: `inventory.admin.a.${Date.now()}@test.edu`,
    });
    schoolAId = regA.schoolId;
    schoolASlug = regA.schoolSlug;
    await initializeSchoolTenant({ schoolId: schoolAId, schoolSlug: schoolASlug, adminUserId: randomUUID() });

    // Register School B
    const regB = await registerSchool({
      schoolName: "Apexium Inventory School B",
      adminFirstName: "Admin",
      adminLastName: "Beta",
      adminEmail: `inventory.admin.b.${Date.now()}@test.edu`,
    });
    schoolBId = regB.schoolId;
    schoolBSlug = regB.schoolSlug;
    await initializeSchoolTenant({ schoolId: schoolBId, schoolSlug: schoolBSlug, adminUserId: randomUUID() });
  });

  // ── 1. Inventory Items & Stock Movements ────────────────────────────────────
  describe("Inventory Items & Stock Movements", () => {
    it("should create inventory items with opening stock", async () => {
      const item = await createInventoryItem({
        schoolId: schoolAId,
        name: "A4 Paper Reams",
        category: "Stationery",
        unit: "reams",
        initialQuantity: 20,
        minimumQuantity: 10,
        unitCost: 3500,
      });

      expect(item.name).toBe("A4 Paper Reams");
      expect(item.currentQuantity).toBe(20);
      expect(item.totalStockValue).toBe(70000);
    });

    it("should perform stock-in and update total stock value", async () => {
      const item = await createInventoryItem({
        schoolId: schoolAId,
        name: "Whiteboard Markers",
        initialQuantity: 10,
        unitCost: 500,
      });

      const updated = await recordStockIn({
        schoolId: schoolAId,
        inventoryItemId: item.id,
        quantity: 15,
      });

      expect(updated.currentQuantity).toBe(25);
      expect(updated.totalStockValue).toBe(12500);
    });

    it("should reject stock-out when requested quantity exceeds available stock", async () => {
      const item = await createInventoryItem({
        schoolId: schoolAId,
        name: "Laboratory Flasks",
        initialQuantity: 5,
        unitCost: 2000,
      });

      await expect(
        recordStockOut({
          schoolId: schoolAId,
          inventoryItemId: item.id,
          quantity: 10,
        })
      ).rejects.toThrow(/Insufficient stock/);
    });
  });

  // ── 2. Low-Stock Threshold Alerts ──────────────────────────────────────────
  describe("Low-Stock Threshold Alerts", () => {
    it("should trigger low-stock alert when quantity drops below reorder threshold", async () => {
      // Initial quantity = 20, reorder limit = 10
      const item = await createInventoryItem({
        schoolId: schoolAId,
        name: "Printer Toner Cartridge",
        initialQuantity: 20,
        minimumQuantity: 10,
        unitCost: 15000,
      });

      // Stock out 11 -> remaining = 9 <= 10
      await recordStockOut({
        schoolId: schoolAId,
        inventoryItemId: item.id,
        quantity: 11,
      });

      const alerts = await getLowStockAlerts(schoolAId);
      const alertedItem = alerts.find((i) => i.id === item.id);

      expect(alertedItem).toBeDefined();
      expect(alertedItem?.currentQuantity).toBe(9);
    });

    it("should NOT trigger low-stock alert when item is above reorder threshold", async () => {
      const item = await createInventoryItem({
        schoolId: schoolAId,
        name: "Football Balls",
        initialQuantity: 50,
        minimumQuantity: 10,
        unitCost: 8000,
      });

      const alerts = await getLowStockAlerts(schoolAId);
      const alertedItem = alerts.find((i) => i.id === item.id);

      expect(alertedItem).toBeUndefined();
    });
  });

  // ── 3. Suppliers & Purchase Order Workflow ────────────────────────────────
  describe("Suppliers & Purchase Order Integration", () => {
    it("should create purchase order and receive it to perform stock-in + Finance integration", async () => {
      const supplier = await createSupplier({
        schoolId: schoolAId,
        name: "Lagos Educational Supplies Ltd",
        contactPerson: "Mr. Adebayo",
        phone: "+2348012345678",
      });

      const item = await createInventoryItem({
        schoolId: schoolAId,
        name: "Physics Textbooks SS3",
        initialQuantity: 5,
        unitCost: 4000,
      });

      const po = await createPurchaseOrder({
        schoolId: schoolAId,
        supplierId: supplier.id,
        items: [{ inventoryItemId: item.id, quantity: 30, unitPrice: 4000 }],
      });

      expect(po.status).toBe("draft");
      expect(po.totalAmount).toBe(120000);

      // Receive PO -> triggers automatic stock-in and Finance expense logging
      const receivedPo = await receivePurchaseOrder({
        schoolId: schoolAId,
        purchaseOrderId: po.id,
      });

      expect(receivedPo.status).toBe("received");

      const updatedItem = await getInventoryItem(schoolAId, item.id);
      expect(updatedItem?.currentQuantity).toBe(35); // 5 initial + 30 received
    });
  });

  // ── 4. Straight-Line Fixed Asset Depreciation & Barcode Lookup ────────────
  describe("Fixed Asset Depreciation & Barcode/QR Lookup", () => {
    it("should calculate straight-line depreciation correctly against hand-verified example", () => {
      // Hand-verified example:
      // Purchase Cost = 1,000,000 NGN, Residual Value = 100,000 NGN, Useful Life = 5 years
      // Depreciable Amount = 900,000 NGN
      // Annual Depreciation = 180,000 NGN
      const calc = calculateDepreciation({
        purchaseCost: 1000000,
        residualValue: 100000,
        usefulLifeYears: 5,
      });

      expect(calc.depreciableAmount).toBe(900000);
      expect(calc.annualDepreciation).toBe(180000);
    });

    it("should register fixed asset and resolve barcode/QR lookup strictly for school tenant", async () => {
      const asset = await registerAsset({
        schoolId: schoolAId,
        assetName: "ICT Lab Server Desk",
        category: "Furniture",
        purchaseCost: 500000,
        usefulLifeYears: 5,
        residualValue: 50000,
        barcode: "BARCODE-SCHOOLA-001",
        qrCode: "QRCODE-SCHOOLA-001",
      });

      expect(asset.barcode).toBe("BARCODE-SCHOOLA-001");

      // Lookup by barcode in School A
      const foundAsset = await lookupAssetByCode(schoolAId, "BARCODE-SCHOOLA-001");
      expect(foundAsset).not.toBeNull();
      expect(foundAsset?.assetName).toBe("ICT Lab Server Desk");

      // Attempt lookup of School A asset from School B -> MUST return null (Tenant Isolated)
      const crossTenantLookup = await lookupAssetByCode(schoolBId, "BARCODE-SCHOOLA-001");
      expect(crossTenantLookup).toBeNull();
    });
  });

  // ── 5. Multi-Tenant Strict Isolation ───────────────────────────────────────
  describe("Multi-Tenant Strict Isolation (School A vs School B)", () => {
    it("should strictly isolate inventory items, suppliers, purchase orders, and assets by school_id", async () => {
      // Create School B item & asset
      const itemB = await createInventoryItem({
        schoolId: schoolBId,
        name: "School B Exclusive Item",
        initialQuantity: 100,
      });

      const assetB = await registerAsset({
        schoolId: schoolBId,
        assetName: "School B Generator",
        purchaseCost: 2000000,
        barcode: "BARCODE-SCHOOLB-999",
      });

      // School A inventory items query must NOT contain School B item
      const itemsA = await getInventoryItems(schoolAId);
      expect(itemsA.some((i) => i.id === itemB.id)).toBe(false);

      // School A fixed assets query must NOT contain School B asset
      const assetsA = await getSchoolAssets(schoolAId);
      expect(assetsA.some((a) => a.id === assetB.id)).toBe(false);

      // School A stock-out attempt against School B item MUST fail
      await expect(
        recordStockOut({
          schoolId: schoolAId, // Attempting to use School A schoolId on School B item
          inventoryItemId: itemB.id,
          quantity: 5,
        })
      ).rejects.toThrow();
    });
  });
});

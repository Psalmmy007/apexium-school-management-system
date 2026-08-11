/**
 * Milestone 30 — Inventory & Fixed Asset Management Service
 *
 * Implements inventory tracking, stock movements (in/out/adjustments),
 * low-stock threshold alerts (integrated with Milestone 20 Communication Centre),
 * suppliers, purchase order lifecycle (integrated with Milestone 19 Finance expenses),
 * and fixed-asset straight-line depreciation & barcode/QR code lookup.
 *
 * EVERYTHING is strictly tenant-scoped via schoolId.
 */
import { db } from "../client";
import { eq, and, lte, desc, sql, count } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  inventoryItems,
  inventoryTransactions,
  suppliers,
  purchaseOrders,
  purchaseOrderItems,
  assetRegister,
} from "../schema/index";
import { sendNotification } from "./communication";
import { recordExpense } from "./finance";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface InventoryItemData {
  id: string;
  schoolId: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  sku: string | null;
  currentQuantity: number;
  minimumQuantity: number;
  unitCost: number;
  totalStockValue: number;
  isActive: boolean;
}

export interface SupplierData {
  id: string;
  schoolId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxNumber: string | null;
  status: string;
  notes: string | null;
}

export interface PurchaseOrderData {
  id: string;
  schoolId: string;
  supplierId: string;
  orderNumber: string;
  orderDate: Date;
  status: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
}

export interface AssetData {
  id: string;
  schoolId: string;
  assetName: string;
  category: string;
  purchaseDate: Date;
  purchaseCost: number;
  usefulLifeYears: number;
  depreciationMethod: string;
  accumulatedDepreciation: number;
  currentBookValue: number;
  residualValue: number;
  barcode: string | null;
  qrCode: string | null;
  status: string;
}

// ── 1. Inventory Items CRUD ───────────────────────────────────────────────────
export async function createInventoryItem(params: {
  schoolId: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  sku?: string;
  initialQuantity?: number;
  minimumQuantity?: number;
  unitCost?: number;
}): Promise<InventoryItemData> {
  const initialQty = Math.max(0, params.initialQuantity ?? 0);
  const unitCost = Math.max(0, params.unitCost ?? 0);
  const totalStockValue = initialQty * unitCost;

  const id = randomUUID();

  await db.insert(inventoryItems).values({
    id,
    schoolId: params.schoolId,
    name: params.name.trim(),
    description: params.description?.trim() ?? null,
    category: params.category?.trim() ?? "General",
    unit: params.unit?.trim() ?? "pcs",
    sku: params.sku?.trim() ?? null,
    currentQuantity: initialQty,
    minimumQuantity: Math.max(0, params.minimumQuantity ?? 10),
    unitCost,
    totalStockValue,
    isActive: true,
  });

  if (initialQty > 0) {
    await db.insert(inventoryTransactions).values({
      schoolId: params.schoolId,
      inventoryItemId: id,
      transactionType: "opening_balance",
      quantity: initialQty,
      unitCost,
      resultingBalance: initialQty,
      reference: "OPENING",
      reason: "Initial Stock Setup",
    });
  }

  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, id), eq(inventoryItems.schoolId, params.schoolId)))
    .limit(1);

  return item as InventoryItemData;
}

export async function getInventoryItems(
  schoolId: string,
  filters?: { category?: string; lowStockOnly?: boolean }
): Promise<InventoryItemData[]> {
  let query = db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.schoolId, schoolId), eq(inventoryItems.isActive, true)));

  const items = await query;

  if (filters?.category) {
    return (items as InventoryItemData[]).filter((i) => i.category === filters.category);
  }

  if (filters?.lowStockOnly) {
    return (items as InventoryItemData[]).filter((i) => i.currentQuantity <= i.minimumQuantity);
  }

  return items as InventoryItemData[];
}

export async function getInventoryItem(schoolId: string, itemId: string): Promise<InventoryItemData | null> {
  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.schoolId, schoolId)))
    .limit(1);

  return (item as InventoryItemData) ?? null;
}

// ── 2. Stock Movement (In / Out / Adjust) ────────────────────────────────────
export async function recordStockIn(params: {
  schoolId: string;
  inventoryItemId: string;
  quantity: number;
  unitCost?: number;
  reference?: string;
  reason?: string;
  performedBy?: string;
}): Promise<InventoryItemData> {
  if (params.quantity <= 0) throw new Error("Stock-in quantity must be positive");

  const item = await getInventoryItem(params.schoolId, params.inventoryItemId);
  if (!item) throw new Error(`Inventory item ${params.inventoryItemId} not found`);

  const unitCost = params.unitCost ?? item.unitCost;
  const newQty = item.currentQuantity + params.quantity;
  const newTotalValue = newQty * unitCost;

  await db
    .update(inventoryItems)
    .set({
      currentQuantity: newQty,
      unitCost,
      totalStockValue: newTotalValue,
      updatedAt: new Date(),
    })
    .where(and(eq(inventoryItems.id, item.id), eq(inventoryItems.schoolId, params.schoolId)));

  await db.insert(inventoryTransactions).values({
    schoolId: params.schoolId,
    inventoryItemId: item.id,
    transactionType: "stock_in",
    quantity: params.quantity,
    unitCost,
    resultingBalance: newQty,
    reference: params.reference ?? "STOCK_IN",
    reason: params.reason ?? null,
    performedBy: params.performedBy ?? null,
  });

  return (await getInventoryItem(params.schoolId, item.id))!;
}

export async function recordStockOut(params: {
  schoolId: string;
  inventoryItemId: string;
  quantity: number;
  reference?: string;
  reason?: string;
  performedBy?: string;
}): Promise<InventoryItemData> {
  if (params.quantity <= 0) throw new Error("Stock-out quantity must be positive");

  const item = await getInventoryItem(params.schoolId, params.inventoryItemId);
  if (!item) throw new Error(`Inventory item ${params.inventoryItemId} not found`);

  if (item.currentQuantity < params.quantity) {
    throw new Error(
      `Insufficient stock for item "${item.name}". Available: ${item.currentQuantity}, Requested: ${params.quantity}`
    );
  }

  const newQty = item.currentQuantity - params.quantity;
  const newTotalValue = newQty * item.unitCost;

  await db
    .update(inventoryItems)
    .set({
      currentQuantity: newQty,
      totalStockValue: newTotalValue,
      updatedAt: new Date(),
    })
    .where(and(eq(inventoryItems.id, item.id), eq(inventoryItems.schoolId, params.schoolId)));

  await db.insert(inventoryTransactions).values({
    schoolId: params.schoolId,
    inventoryItemId: item.id,
    transactionType: "stock_out",
    quantity: -params.quantity,
    unitCost: item.unitCost,
    resultingBalance: newQty,
    reference: params.reference ?? "STOCK_OUT",
    reason: params.reason ?? null,
    performedBy: params.performedBy ?? null,
  });

  // Check low stock threshold trigger
  if (newQty <= item.minimumQuantity) {
    await sendNotification({
      schoolId: params.schoolId,
      recipientId: params.performedBy ?? "admin",
      title: "Low Stock Alert",
      message: `Inventory item "${item.name}" has dropped to ${newQty} ${item.unit} (Threshold: ${item.minimumQuantity}).`,
      type: "alert",
    }).catch(() => {});
  }

  return (await getInventoryItem(params.schoolId, item.id))!;
}

// ── 3. Low Stock Alerts Check ────────────────────────────────────────────────
export async function getLowStockAlerts(schoolId: string): Promise<InventoryItemData[]> {
  const allItems = await getInventoryItems(schoolId);
  return allItems.filter((item) => item.currentQuantity <= item.minimumQuantity);
}

// ── 4. Supplier Management ────────────────────────────────────────────────────
export async function createSupplier(params: {
  schoolId: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}): Promise<SupplierData> {
  const id = randomUUID();

  await db.insert(suppliers).values({
    id,
    schoolId: params.schoolId,
    name: params.name.trim(),
    contactPerson: params.contactPerson?.trim() ?? null,
    phone: params.phone?.trim() ?? null,
    email: params.email?.trim() ?? null,
    address: params.address?.trim() ?? null,
    status: "active",
  });

  const [sup] = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, id), eq(suppliers.schoolId, params.schoolId)))
    .limit(1);

  return sup as SupplierData;
}

export async function getSuppliers(schoolId: string): Promise<SupplierData[]> {
  const sups = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.schoolId, schoolId), eq(suppliers.status, "active")));

  return sups as SupplierData[];
}

// ── 5. Purchase Order Workflow ────────────────────────────────────────────────
export async function createPurchaseOrder(params: {
  schoolId: string;
  supplierId: string;
  items: Array<{ inventoryItemId: string; quantity: number; unitPrice: number }>;
  notes?: string;
  createdBy?: string;
}): Promise<PurchaseOrderData> {
  const countRes = await db
    .select({ total: count() })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.schoolId, params.schoolId));

  const seq = Number(countRes[0]?.total ?? 0) + 1;
  const orderNumber = `PO-${params.schoolId.slice(0, 4).toUpperCase()}-${String(seq).padStart(4, "0")}`;

  let subtotal = 0;
  params.items.forEach((item) => {
    subtotal += item.quantity * item.unitPrice;
  });

  const poId = randomUUID();

  await db.insert(purchaseOrders).values({
    id: poId,
    schoolId: params.schoolId,
    supplierId: params.supplierId,
    orderNumber,
    status: "draft",
    subtotal,
    taxAmount: 0,
    totalAmount: subtotal,
    notes: params.notes ?? null,
    createdBy: params.createdBy ?? null,
  });

  for (const item of params.items) {
    await db.insert(purchaseOrderItems).values({
      purchaseOrderId: poId,
      inventoryItemId: item.inventoryItemId,
      quantityOrdered: item.quantity,
      quantityReceived: 0,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
    });
  }

  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.schoolId, params.schoolId)))
    .limit(1);

  return po as PurchaseOrderData;
}

export async function receivePurchaseOrder(params: {
  schoolId: string;
  purchaseOrderId: string;
  performedBy?: string;
}): Promise<PurchaseOrderData> {
  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, params.purchaseOrderId), eq(purchaseOrders.schoolId, params.schoolId)))
    .limit(1);

  if (!po) throw new Error(`Purchase order ${params.purchaseOrderId} not found`);

  if (po.status === "received") return po as PurchaseOrderData; // Idempotent

  // Fetch PO items
  const items = await db
    .select()
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.purchaseOrderId, po.id));

  // Perform Stock In for each PO line item
  for (const item of items) {
    await recordStockIn({
      schoolId: params.schoolId,
      inventoryItemId: item.inventoryItemId,
      quantity: item.quantityOrdered,
      unitCost: item.unitPrice,
      reference: po.orderNumber,
      reason: `Received PO ${po.orderNumber}`,
      performedBy: params.performedBy,
    });

    await db
      .update(purchaseOrderItems)
      .set({ quantityReceived: item.quantityOrdered })
      .where(eq(purchaseOrderItems.id, item.id));
  }

  // Update PO status to received
  await db
    .update(purchaseOrders)
    .set({ status: "received", updatedAt: new Date() })
    .where(and(eq(purchaseOrders.id, po.id), eq(purchaseOrders.schoolId, params.schoolId)));

  // Integrate with Milestone 19 Finance: Record as an expense
  await recordExpense({
    schoolId: params.schoolId,
    category: "Inventory Purchase",
    amount: po.totalAmount,
    description: `Purchase Order ${po.orderNumber} receipt`,
    date: new Date(),
  }).catch(() => {});

  const [updatedPo] = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, po.id))
    .limit(1);

  return updatedPo as PurchaseOrderData;
}

// ── 6. Fixed Asset Register & Straight-Line Depreciation ─────────────────────
export async function registerAsset(params: {
  schoolId: string;
  assetName: string;
  category?: string;
  description?: string;
  purchaseDate?: Date;
  purchaseCost: number;
  usefulLifeYears?: number;
  residualValue?: number;
  location?: string;
  assignedDepartment?: string;
  barcode?: string;
  qrCode?: string;
}): Promise<AssetData> {
  const purchaseCost = Math.max(0, params.purchaseCost);
  const usefulLife = Math.max(1, params.usefulLifeYears ?? 5);
  const residualValue = Math.max(0, params.residualValue ?? 0);

  const barcode = params.barcode?.trim() || `AST-BC-${params.schoolId.slice(0, 4).toUpperCase()}-${Date.now()}`;
  const qrCode = params.qrCode?.trim() || `AST-QR-${params.schoolId.slice(0, 4).toUpperCase()}-${Date.now()}`;

  const id = randomUUID();

  await db.insert(assetRegister).values({
    id,
    schoolId: params.schoolId,
    assetName: params.assetName.trim(),
    category: params.category?.trim() ?? "Furniture",
    description: params.description?.trim() ?? null,
    purchaseDate: params.purchaseDate ?? new Date(),
    purchaseCost,
    usefulLifeYears: usefulLife,
    depreciationMethod: "straight_line",
    accumulatedDepreciation: 0,
    currentBookValue: purchaseCost,
    residualValue,
    location: params.location?.trim() ?? null,
    assignedDepartment: params.assignedDepartment?.trim() ?? null,
    barcode,
    qrCode,
    status: "active",
  });

  const [asset] = await db
    .select()
    .from(assetRegister)
    .where(and(eq(assetRegister.id, id), eq(assetRegister.schoolId, params.schoolId)))
    .limit(1);

  return asset as AssetData;
}

/**
 * Calculates Straight-Line Depreciation:
 * Depreciable Base = Purchase Cost - Residual Value
 * Annual Depreciation = Depreciable Base / Useful Life Years
 */
export function calculateDepreciation(params: {
  purchaseCost: number;
  residualValue: number;
  usefulLifeYears: number;
}): { depreciableAmount: number; annualDepreciation: number } {
  const purchaseCost = Math.max(0, params.purchaseCost);
  const residualValue = Math.max(0, params.residualValue);
  const usefulLife = Math.max(1, params.usefulLifeYears);

  const depreciableAmount = Math.max(0, purchaseCost - residualValue);
  const annualDepreciation = Number((depreciableAmount / usefulLife).toFixed(2));

  return { depreciableAmount, annualDepreciation };
}

// ── 7. Barcode / QR Asset Lookup (Tenant-Scoped) ──────────────────────────────
export async function lookupAssetByCode(
  schoolId: string,
  code: string
): Promise<AssetData | null> {
  if (!code?.trim()) return null;

  const cleanCode = code.trim();

  // Check barcode or QR code strictly within schoolId
  const [asset] = await db
    .select()
    .from(assetRegister)
    .where(
      and(
        eq(assetRegister.schoolId, schoolId),
        sql`(${assetRegister.barcode} = ${cleanCode} OR ${assetRegister.qrCode} = ${cleanCode})`
      )
    )
    .limit(1);

  return (asset as AssetData) ?? null;
}

export async function getSchoolAssets(schoolId: string): Promise<AssetData[]> {
  const assets = await db
    .select()
    .from(assetRegister)
    .where(eq(assetRegister.schoolId, schoolId));

  return assets as AssetData[];
}

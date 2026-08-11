"use client";

import React, { useEffect, useState } from "react";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  sku: string | null;
  currentQuantity: number;
  minimumQuantity: number;
  unitCost: number;
  totalStockValue: number;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
}

interface Asset {
  id: string;
  assetName: string;
  category: string;
  purchaseCost: number;
  usefulLifeYears: number;
  currentBookValue: number;
  barcode: string | null;
  qrCode: string | null;
  status: string;
}

export default function InventoryClient() {
  const [activeTab, setActiveTab] = useState<"overview" | "items" | "suppliers" | "assets" | "alerts">("overview");

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showItemModal, setShowItemModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "Stationery", unit: "pcs", initialQuantity: 50, minimumQuantity: 10, unitCost: 500 });

  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [stockTxType, setStockTxType] = useState<"stock_in" | "stock_out">("stock_in");
  const [stockTxQty, setStockTxQty] = useState(10);

  const [showAssetModal, setShowAssetModal] = useState(false);
  const [newAsset, setNewAsset] = useState({ assetName: "", category: "Furniture", purchaseCost: 150000, usefulLifeYears: 5 });

  const [scanCode, setScanCode] = useState("");
  const [scannedAsset, setScannedAsset] = useState<any | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, suppliersRes, assetsRes] = await Promise.all([
        fetch("/api/inventory/items").then((r) => r.json()),
        fetch("/api/inventory/suppliers").then((r) => r.json()),
        fetch("/api/inventory/assets").then((r) => r.json()),
      ]);

      if (itemsRes.items) setItems(itemsRes.items);
      if (suppliersRes.suppliers) setSuppliers(suppliersRes.suppliers);
      if (assetsRes.assets) setAssets(assetsRes.assets);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        setShowItemModal(false);
        fetchData();
      }
    } catch {
      // ignore
    }
  };

  const handleStockTx = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/inventory/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId: selectedItemId,
          type: stockTxType,
          quantity: stockTxQty,
        }),
      });
      if (res.ok) {
        setShowStockModal(false);
        fetchData();
      }
    } catch {
      // ignore
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/inventory/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAsset),
      });
      if (res.ok) {
        setShowAssetModal(false);
        fetchData();
      }
    } catch {
      // ignore
    }
  };

  const handleScanCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanError(null);
    setScannedAsset(null);

    try {
      const res = await fetch(`/api/inventory/assets?code=${encodeURIComponent(scanCode)}`);
      const data = await res.json();
      if (res.ok && data.asset) {
        setScannedAsset(data.asset);
      } else {
        setScanError(data.error || "Asset not found");
      }
    } catch {
      setScanError("Failed to lookup asset");
    }
  };

  const totalStockValue = items.reduce((sum, item) => sum + item.totalStockValue, 0);
  const lowStockItems = items.filter((item) => item.currentQuantity <= item.minimumQuantity);
  const totalAssetValue = assets.reduce((sum, asset) => sum + asset.purchaseCost, 0);

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Inventory & Fixed Asset Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track consumable stock, movements, suppliers, purchase orders, fixed assets, and depreciation.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowItemModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
          >
            + Add Inventory Item
          </button>
          <button
            onClick={() => setShowAssetModal(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/20 transition"
          >
            + Register Asset
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 border-b-2 transition ${activeTab === "overview" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("items")}
          className={`pb-3 border-b-2 transition ${activeTab === "items" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          Inventory Items ({items.length})
        </button>
        <button
          onClick={() => setActiveTab("suppliers")}
          className={`pb-3 border-b-2 transition ${activeTab === "suppliers" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          Suppliers ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveTab("assets")}
          className={`pb-3 border-b-2 transition ${activeTab === "assets" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          Fixed Assets & QR Lookup ({assets.length})
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`pb-3 border-b-2 transition flex items-center space-x-2 ${activeTab === "alerts" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          <span>Low Stock Alerts</span>
          {lowStockItems.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              {lowStockItems.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading inventory data...</div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <div className="text-xs font-medium text-slate-400 uppercase">Total Inventory Items</div>
                  <div className="text-3xl font-extrabold text-white mt-2">{items.length}</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <div className="text-xs font-medium text-slate-400 uppercase">Total Stock Value</div>
                  <div className="text-3xl font-extrabold text-indigo-400 mt-2">₦{totalStockValue.toLocaleString()}</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <div className="text-xs font-medium text-slate-400 uppercase">Low Stock Threshold Alerts</div>
                  <div className="text-3xl font-extrabold text-red-400 mt-2">{lowStockItems.length}</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <div className="text-xs font-medium text-slate-400 uppercase">Fixed Asset Investment</div>
                  <div className="text-3xl font-extrabold text-purple-400 mt-2">₦{totalAssetValue.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVENTORY ITEMS */}
          {activeTab === "items" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Item Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Quantity</th>
                      <th className="px-6 py-4">Unit Cost</th>
                      <th className="px-6 py-4">Total Value</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-850/50 transition">
                        <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                        <td className="px-6 py-4 text-xs text-indigo-300">{item.category}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.currentQuantity <= item.minimumQuantity ? "bg-red-500/20 text-red-400" : "bg-slate-800 text-slate-200"
                          }`}>
                            {item.currentQuantity} {item.unit}
                          </span>
                        </td>
                        <td className="px-6 py-4">₦{item.unitCost.toLocaleString()}</td>
                        <td className="px-6 py-4 font-semibold text-white">₦{item.totalStockValue.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              setSelectedItemId(item.id);
                              setShowStockModal(true);
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 rounded-lg transition"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ASSETS & BARCODE LOOKUP */}
          {activeTab === "assets" && (
            <div className="space-y-8">
              {/* Scan / Code Search Bar */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-lg font-semibold text-white">Barcode / QR Asset Lookup</h3>
                <form onSubmit={handleScanCode} className="flex space-x-3">
                  <input
                    type="text"
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    placeholder="Enter Barcode or QR Code..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Scan / Search Asset
                  </button>
                </form>

                {scanError && <p className="text-xs text-red-400">{scanError}</p>}

                {scannedAsset && (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                    <div className="font-bold text-base text-indigo-300">{scannedAsset.assetName}</div>
                    <div>Purchase Cost: ₦{scannedAsset.purchaseCost.toLocaleString()}</div>
                    <div>Useful Life: {scannedAsset.usefulLifeYears} years</div>
                    <div>Depreciation: ₦{scannedAsset.depreciationInfo?.annualDepreciation.toLocaleString()}/year</div>
                    <div>Current Book Value: ₦{scannedAsset.currentBookValue.toLocaleString()}</div>
                  </div>
                )}
              </div>

              {/* Asset List */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950 text-xs uppercase text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-4">Asset Name</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Purchase Cost</th>
                        <th className="px-6 py-4">Useful Life</th>
                        <th className="px-6 py-4">Barcode / QR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {assets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-slate-850/50 transition">
                          <td className="px-6 py-4 font-medium text-white">{asset.assetName}</td>
                          <td className="px-6 py-4 text-xs text-indigo-300">{asset.category}</td>
                          <td className="px-6 py-4 font-semibold text-white">₦{asset.purchaseCost.toLocaleString()}</td>
                          <td className="px-6 py-4">{asset.usefulLifeYears} years</td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-400">{asset.barcode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4">
            <h3 className="text-xl font-bold text-white">Add New Inventory Item</h3>
            <form onSubmit={handleCreateItem} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-400 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Exercise Books A4"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Unit</label>
                  <input
                    type="text"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Initial Qty</label>
                  <input
                    type="number"
                    value={newItem.initialQuantity}
                    onChange={(e) => setNewItem({ ...newItem, initialQuantity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Reorder Limit</label>
                  <input
                    type="number"
                    value={newItem.minimumQuantity}
                    onChange={(e) => setNewItem({ ...newItem, minimumQuantity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Unit Cost (₦)</label>
                <input
                  type="number"
                  value={newItem.unitCost}
                  onChange={(e) => setNewItem({ ...newItem, unitCost: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl"
                >
                  Create Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

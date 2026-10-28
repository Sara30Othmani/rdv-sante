"use client";

import { useCallback, useEffect, useState } from "react";
import { apiJson } from "@/lib/api";
import type {
  StockItem,
  StockKpis,
  NewStockItemPayload,
  UpdateStockPayload,
  StockMovement,
  StockMovementType,
} from "./types";

const DEFAULT_KPIS: StockKpis = {
  totalItems: 0,
  totalQuantity: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  expiringCount: 0,
  expiredCount: 0,
};

export function useStock() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [kpis, setKpis] = useState<StockKpis>(DEFAULT_KPIS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<{ items: StockItem[]; kpis: StockKpis }>("/api/stock");
      setItems(data.items);
      setKpis(data.kpis);
    } catch (e: any) {
      setError(e.message || "Impossible de charger le stock.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async (payload: NewStockItemPayload): Promise<StockItem> => {
    const newItem = await apiJson<StockItem>("/api/stock", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await refresh();
    return newItem;
  };

  const updateItem = async (id: string, payload: UpdateStockPayload): Promise<StockItem> => {
    const updated = await apiJson<StockItem>(`/api/stock/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    await refresh();
    return updated;
  };

  const deleteItem = async (id: string): Promise<void> => {
    await apiJson<{ success: boolean }>(`/api/stock/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await refresh();
  };

  const quickAdjustQuantity = async (
    id: string,
    action: StockMovementType,
    movementQuantity: number,
    reason?: string,
    batchNumber?: string
  ): Promise<StockItem> => {
    return updateItem(id, {
      action,
      movementQuantity,
      reason,
      batchNumber,
    });
  };

  const updateThreshold = async (id: string, lowStockThreshold: number): Promise<StockItem> => {
    return updateItem(id, { lowStockThreshold });
  };

  const getMovements = async (id: string): Promise<StockMovement[]> => {
    return apiJson<StockMovement[]>(`/api/stock/${encodeURIComponent(id)}/movements`);
  };

  return {
    items,
    kpis,
    loading,
    error,
    refresh,
    addItem,
    updateItem,
    deleteItem,
    quickAdjustQuantity,
    updateThreshold,
    getMovements,
  };
}

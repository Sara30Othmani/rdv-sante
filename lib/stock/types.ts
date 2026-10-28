export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
export type ExpirationStatus = "OK" | "EXPIRING_SOON" | "EXPIRED";

export type StockBatch = {
  batchNumber: string;
  quantity: number;
  expiresAt: string | null;
};

export type MedicationSummary = {
  id: string;
  name: string;
  genericName?: string;
  form?: string;
  dosage?: string;
  category?: string;
  manufacturer?: string;
};

export type StockItem = {
  id: string;
  doctorId: string;
  medicationId: string;
  medication: MedicationSummary;
  quantity: number;
  lowStockThreshold: number;
  unit: string;
  location?: string;
  batches: StockBatch[];
  status: StockStatus;
  expirationStatus: ExpirationStatus;
  nearestExpiration?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StockMovementType = "IN" | "OUT" | "ADJUSTMENT" | "EXPIRED";

export type StockMovement = {
  id: string;
  stockItemId: string;
  doctorId: string;
  type: StockMovementType;
  quantity: number;
  batchNumber?: string;
  reason?: string;
  prescriptionId?: string;
  createdBy?: string;
  createdAt: string;
};

export type StockKpis = {
  totalItems: number;
  totalQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringCount: number;
  expiredCount: number;
};

export type NewStockItemPayload = {
  medicationId?: string;
  name?: string;
  genericName?: string;
  category?: string;
  form?: string;
  dosage?: string;
  manufacturer?: string;
  quantity: number;
  lowStockThreshold?: number;
  unit?: string;
  location?: string;
  batchNumber?: string;
  expiresAt?: string;
};

export type UpdateStockPayload = {
  quantity?: number;
  lowStockThreshold?: number;
  unit?: string;
  location?: string;
  batches?: StockBatch[];
  // Si on effectue un mouvement
  action?: StockMovementType;
  movementQuantity?: number;
  reason?: string;
  batchNumber?: string;
};

export type StockReceiptStatus = "DRAFT" | "POSTED";

export interface StockReceiptVariantSearchHit {
  variantId: string;
  sku: string;
  stock: number;
  attributes: Record<string, string>;
  isDefault: boolean;
  productId: string;
  productName: string;
  productStatus: string;
}

export interface StockReceiptLine {
  lineId?: string;
  receiptId?: string;
  variantId: string;
  quantity: number;
  unitCost: number;
  lineTotal?: number;
  variant?: {
    variantId: string;
    sku: string;
    stock: number;
    attributes: Record<string, string>;
    isDefault: boolean;
    productId: string;
    product?: { productId: string; name: string; status: string };
  };
}

export interface StockReceipt {
  receiptId: string;
  receivedAt: string;
  note: string | null;
  supplierName: string | null;
  status: StockReceiptStatus;
  createdByClerkId: string;
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines: StockReceiptLine[];
  totalCost?: number;
}

export interface StockReceiptReportSummary {
  from: string;
  to: string;
  totalUnits: number;
  totalCost: number;
  receiptCount: number;
}

export interface StockReceiptLineInput {
  variantId: string;
  quantity: number;
  unitCost: number;
}

export interface StockReceiptFormPayload {
  receivedAt: string;
  note?: string | null;
  supplierName?: string | null;
  lines?: StockReceiptLineInput[];
}

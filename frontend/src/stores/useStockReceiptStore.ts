import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { stockReceiptsApi } from "../apis/stockReceiptsApi";
import type { ApiError, StockReceipt, StockReceiptFormPayload, StockReceiptReportSummary } from "../types";

type Result = { success: boolean; error?: string };

function errorMessage(err: unknown, fallback: string) {
  if (isAxiosError(err)) {
    const d = err.response?.data as { error?: string; details?: string } | undefined;
    if (d?.error) return d.error;
    if (d?.details) return d.details;
    if (err.message) return err.message;
  }
  return (err as ApiError)?.message || fallback;
}

interface StockReceiptState {
  receipts: StockReceipt[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  loading: boolean;
  error: string | null;
  fetchReceipts: (params?: { page?: number; limit?: number; status?: string }) => Promise<void>;
  createReceipt: (payload: StockReceiptFormPayload) => Promise<{ success: boolean; receipt?: StockReceipt; error?: string }>;
  updateReceipt: (receiptId: string, payload: Partial<StockReceiptFormPayload>) => Promise<Result>;
  deleteReceipt: (receiptId: string) => Promise<Result>;
  postReceipt: (receiptId: string) => Promise<Result>;
  reportSummary: (from: string, to: string) => Promise<StockReceiptReportSummary | null>;
}

export const useStockReceiptStore = create<StockReceiptState>()(
  devtools(
    (set) => ({
      receipts: [],
      totalItems: 0,
      totalPages: 1,
      currentPage: 1,
      loading: false,
      error: null,

      fetchReceipts: async (params) => {
        set({ loading: true, error: null });
        try {
          const res = await stockReceiptsApi.list(params);
          set({
            receipts: res.data,
            totalItems: res.totalItems,
            totalPages: res.totalPages,
            currentPage: res.currentPage,
            loading: false,
          });
        } catch (err) {
          set({ loading: false, error: errorMessage(err, "Could not load stock receipts") });
        }
      },

      createReceipt: async (payload) => {
        try {
          const receipt = await stockReceiptsApi.create(payload);
          set((s) => ({
            receipts: [receipt, ...s.receipts.filter((r) => r.receiptId !== receipt.receiptId)],
            error: null,
          }));
          toast.success("Receipt created");
          return { success: true, receipt };
        } catch (err) {
          const message = errorMessage(err, "Failed to create receipt");
          set({ error: message });
          toast.error(message);
          return { success: false, error: message };
        }
      },

      updateReceipt: async (receiptId, payload) => {
        try {
          const receipt = await stockReceiptsApi.update(receiptId, payload);
          set((s) => ({
            receipts: s.receipts.map((r) => (r.receiptId === receiptId ? receipt : r)),
            error: null,
          }));
          toast.success("Receipt saved");
          return { success: true };
        } catch (err) {
          const message = errorMessage(err, "Failed to save receipt");
          set({ error: message });
          toast.error(message);
          return { success: false, error: message };
        }
      },

      deleteReceipt: async (receiptId) => {
        try {
          await stockReceiptsApi.delete(receiptId);
          set((s) => ({ receipts: s.receipts.filter((r) => r.receiptId !== receiptId), error: null }));
          toast.success("Draft deleted");
          return { success: true };
        } catch (err) {
          const message = errorMessage(err, "Failed to delete receipt");
          set({ error: message });
          toast.error(message);
          return { success: false, error: message };
        }
      },

      postReceipt: async (receiptId) => {
        try {
          const receipt = await stockReceiptsApi.post(receiptId);
          set((s) => ({
            receipts: s.receipts.map((r) => (r.receiptId === receiptId ? receipt : r)),
            error: null,
          }));
          toast.success("Stock receipt posted — inventory updated");
          return { success: true };
        } catch (err) {
          const message = errorMessage(err, "Failed to post receipt");
          set({ error: message });
          toast.error(message);
          return { success: false, error: message };
        }
      },

      reportSummary: async (from, to) => {
        try {
          return await stockReceiptsApi.reportSummary(from, to);
        } catch (err) {
          const message = errorMessage(err, "Could not load report");
          toast.error(message);
          return null;
        }
      },
    }),
    { name: "stockReceipts" }
  )
);

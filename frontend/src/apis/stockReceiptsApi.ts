import axiosInstance from "../lib/axios";
import { API_ROUTE } from "../constant";
import type {
  StockReceipt,
  StockReceiptFormPayload,
  StockReceiptReportSummary,
  StockReceiptVariantSearchHit,
} from "../types/stockReceiptType";

const base = API_ROUTE.STOCK_RECEIPTS;

export const stockReceiptsApi = {
  list: async (params?: { page?: number; limit?: number; status?: string }) => {
    const { data } = await axiosInstance.get<{
      totalItems: number;
      totalPages: number;
      currentPage: number;
      data: StockReceipt[];
    }>(base, { params });
    return data;
  },

  getById: async (receiptId: string): Promise<StockReceipt> => {
    const { data } = await axiosInstance.get<{ receipt: StockReceipt }>(`${base}/${receiptId}`);
    return data.receipt;
  },

  create: async (payload: StockReceiptFormPayload): Promise<StockReceipt> => {
    const { data } = await axiosInstance.post<{ receipt: StockReceipt }>(base, payload);
    return data.receipt;
  },

  update: async (receiptId: string, payload: Partial<StockReceiptFormPayload>): Promise<StockReceipt> => {
    const { data } = await axiosInstance.put<{ receipt: StockReceipt }>(`${base}/${receiptId}`, payload);
    return data.receipt;
  },

  delete: async (receiptId: string): Promise<void> => {
    await axiosInstance.delete(`${base}/${receiptId}`);
  },

  post: async (receiptId: string): Promise<StockReceipt> => {
    const { data } = await axiosInstance.post<{ receipt: StockReceipt }>(`${base}/${receiptId}/post`);
    return data.receipt;
  },

  searchVariants: async (q: string, limit?: number): Promise<StockReceiptVariantSearchHit[]> => {
    const { data } = await axiosInstance.get<{ variants: StockReceiptVariantSearchHit[] }>(
      `${base}/variant-search`,
      { params: { q, limit } }
    );
    return data.variants ?? [];
  },

  reportSummary: async (from: string, to: string): Promise<StockReceiptReportSummary> => {
    const { data } = await axiosInstance.get<{ summary: StockReceiptReportSummary }>(
      `${base}/report/summary`,
      { params: { from, to } }
    );
    return data.summary;
  },
};

import axiosInstance from "../lib/axios";
import { API_ROUTE } from "../constant";
import type { Voucher, VoucherFormPayload } from "../types/voucherType";

const base = API_ROUTE.VOUCHERS;

export const vouchersApi = {
  getAll: async (): Promise<Voucher[]> => {
    const { data } = await axiosInstance.get<{ vouchers: Voucher[] }>(base);
    return data.vouchers ?? [];
  },

  getById: async (voucherId: string): Promise<Voucher> => {
    const { data } = await axiosInstance.get<{ voucher: Voucher }>(`${base}/${voucherId}`);
    return data.voucher;
  },

  create: async (payload: VoucherFormPayload): Promise<Voucher> => {
    const { data } = await axiosInstance.post<{ voucher: Voucher }>(base, payload);
    return data.voucher;
  },

  update: async (voucherId: string, payload: VoucherFormPayload): Promise<Voucher> => {
    const { data } = await axiosInstance.put<{ voucher: Voucher }>(`${base}/${voucherId}`, payload);
    return data.voucher;
  },

  delete: async (voucherId: string): Promise<void> => {
    await axiosInstance.delete(`${base}/${voucherId}`);
  },
};

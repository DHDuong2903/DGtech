import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { vouchersApi } from "../apis/vouchersApi";
import type { ApiError, Voucher, VoucherFormPayload } from "../types";

type Result = { success: boolean; error?: string };

interface VoucherState {
  vouchers: Voucher[];
  loading: boolean;
  error: string | null;
  fetchVouchers: () => Promise<void>;
  createVoucher: (payload: VoucherFormPayload) => Promise<Result>;
  updateVoucher: (voucherId: string, payload: VoucherFormPayload) => Promise<Result>;
  deleteVoucher: (voucherId: string) => Promise<Result>;
  deleteVouchers: (voucherIds: string[]) => Promise<Result>;
}

function errorMessage(err: unknown, fallback: string) {
  if (isAxiosError(err)) {
    const d = err.response?.data as { error?: string; details?: string } | undefined;
    if (d?.error) return d.error;
    if (d?.details) return d.details;
    if (err.message) return err.message;
  }
  return (err as ApiError)?.message || fallback;
}

export const useVoucherStore = create<VoucherState>()(
  devtools(
    (set, get) => ({
      vouchers: [],
      loading: false,
      error: null,

      fetchVouchers: async () => {
        set({ loading: true, error: null });
        try {
          const vouchers = await vouchersApi.getAll();
          set({ vouchers, loading: false });
        } catch (err) {
          set({ loading: false, error: errorMessage(err, "Could not load vouchers") });
        }
      },

      createVoucher: async (payload) => {
        try {
          const voucher = await vouchersApi.create(payload);
          set((state) => ({ vouchers: [voucher, ...state.vouchers.filter((v) => v.voucherId !== voucher.voucherId)] }));
          toast.success("Voucher created");
          return { success: true };
        } catch (err) {
          const message = errorMessage(err, "Failed to create voucher");
          set({ error: message });
          toast.error(message);
          return { success: false, error: message };
        }
      },

      updateVoucher: async (voucherId, payload) => {
        try {
          const voucher = await vouchersApi.update(voucherId, payload);
          set((state) => ({
            vouchers: state.vouchers.map((v) => (v.voucherId === voucherId ? voucher : v)),
            error: null,
          }));
          toast.success("Voucher updated");
          return { success: true };
        } catch (err) {
          const message = errorMessage(err, "Failed to update voucher");
          set({ error: message });
          toast.error(message);
          return { success: false, error: message };
        }
      },

      deleteVoucher: async (voucherId) => {
        try {
          await vouchersApi.delete(voucherId);
          set((state) => ({ vouchers: state.vouchers.filter((v) => v.voucherId !== voucherId), error: null }));
          toast.success("Voucher deleted");
          return { success: true };
        } catch (err) {
          const message = errorMessage(err, "Failed to delete voucher");
          set({ error: message });
          toast.error(message);
          return { success: false, error: message };
        }
      },

      deleteVouchers: async (voucherIds) => {
        try {
          await Promise.all(voucherIds.map((id) => vouchersApi.delete(id)));
          set((state) => ({ vouchers: state.vouchers.filter((v) => !voucherIds.includes(v.voucherId)), error: null }));
          toast.success(voucherIds.length === 1 ? "Voucher deleted" : `${voucherIds.length} vouchers deleted`);
          return { success: true };
        } catch (err) {
          const message = errorMessage(err, "Failed to delete one or more vouchers");
          set({ error: message });
          toast.error(message);
          await get().fetchVouchers();
          return { success: false, error: message };
        }
      },
    }),
    { name: "vouchers" }
  )
);

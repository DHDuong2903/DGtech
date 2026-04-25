import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ApiError, Bundle, BundleFormPayload } from "../types";
import { bundleApi } from "../apis/bundleApi";
import { toast } from "sonner";
import { isAxiosError } from "axios";

function messageFromApiErr(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const d = err.response?.data as { error?: string; details?: string } | undefined;
    if (d && typeof d.error === "string" && d.error.length > 0) return d.error;
    if (d && typeof d.details === "string" && d.details.length > 0) return d.details;
    if (err.message) return err.message;
  }
  const e = err as ApiError;
  return e.message || fallback;
}

interface BundleState {
  bundles: Bundle[];
  loading: boolean;
  error: string | null;

  fetchBundles: () => Promise<void>;
  createBundle: (data: BundleFormPayload) => Promise<{ success: boolean; error?: string }>;
  updateBundle: (
    id: string,
    data: Partial<BundleFormPayload>
  ) => Promise<{ success: boolean; error?: string }>;
  deleteBundle: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteBundles: (ids: string[]) => Promise<{ success: boolean; error?: string }>;
}

export const useBundleStore = create<BundleState>()(
  devtools(
    (set, get) => ({
      bundles: [],
      loading: false,
      error: null,

      fetchBundles: async () => {
        set({ loading: true, error: null });
        try {
          const bundles = await bundleApi.getAll();
          set({ bundles, loading: false });
        } catch (err) {
          console.error(err);
          set({
            error: messageFromApiErr(err, "Could not load bundles"),
            loading: false,
          });
        }
      },

      createBundle: async (data) => {
        try {
          const created = await bundleApi.create(data);
          set((state) => ({
            bundles: [created, ...state.bundles.filter((b) => b.bundleId !== created.bundleId)],
            error: null,
          }));
          toast.success("Bundle created");
          return { success: true };
        } catch (err) {
          const msg = messageFromApiErr(err, "Failed to create bundle");
          set({ error: msg });
          toast.error(msg);
          return { success: false, error: msg };
        }
      },

      updateBundle: async (id, data) => {
        try {
          const updated = await bundleApi.update(id, data);
          set((state) => ({
            bundles: state.bundles.map((b) => (b.bundleId === id ? updated : b)),
            error: null,
          }));
          toast.success("Bundle updated");
          return { success: true };
        } catch (err) {
          const msg = messageFromApiErr(err, "Failed to update bundle");
          set({ error: msg });
          toast.error(msg);
          return { success: false, error: msg };
        }
      },

      deleteBundle: async (id) => {
        try {
          await bundleApi.delete(id);
          set((state) => ({
            bundles: state.bundles.filter((b) => b.bundleId !== id),
            error: null,
          }));
          toast.success("Bundle deleted");
          return { success: true };
        } catch (err) {
          const msg = messageFromApiErr(err, "Failed to delete bundle");
          set({ error: msg });
          toast.error(msg);
          return { success: false, error: msg };
        }
      },

      deleteBundles: async (ids) => {
        if (!ids.length) return { success: true };
        try {
          await Promise.all(ids.map((id) => bundleApi.delete(id)));
          set((state) => ({
            bundles: state.bundles.filter((b) => !ids.includes(b.bundleId)),
            error: null,
          }));
          toast.success(ids.length === 1 ? "Bundle deleted" : `${ids.length} bundles deleted`);
          return { success: true };
        } catch (err) {
          const msg = messageFromApiErr(err, "Failed to delete one or more bundles");
          set({ error: msg });
          toast.error(msg);
          await get().fetchBundles();
          return { success: false, error: msg };
        }
      },
    }),
    { name: "bundles" }
  )
);

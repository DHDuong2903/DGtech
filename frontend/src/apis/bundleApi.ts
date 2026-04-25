import axiosInstance from "../lib/axios";
import { API_ROUTE } from "../constant";
import type { Bundle, BundleFormPayload, StorefrontBundleForPdp } from "../types/bundleType";

const base = API_ROUTE.BUNDLES;

export const bundleApi = {
  getAll: async (): Promise<Bundle[]> => {
    const { data } = await axiosInstance.get<{ bundles: Bundle[] }>(base);
    return data.bundles ?? [];
  },

  getById: async (bundleId: string): Promise<Bundle> => {
    const { data } = await axiosInstance.get<{ bundle: Bundle }>(`${base}/${bundleId}`);
    return data.bundle;
  },

  create: async (payload: BundleFormPayload): Promise<Bundle> => {
    const { data } = await axiosInstance.post<{ bundle: Bundle }>(base, payload);
    return data.bundle;
  },

  update: async (bundleId: string, payload: Partial<BundleFormPayload>): Promise<Bundle> => {
    const { data } = await axiosInstance.put<{ bundle: Bundle }>(`${base}/${bundleId}`, payload);
    return data.bundle;
  },

  delete: async (bundleId: string): Promise<void> => {
    await axiosInstance.delete(`${base}/${bundleId}`);
  },

  /** Public storefront: active bundles that include this product. */
  getStorefrontByProduct: async (productId: string): Promise<StorefrontBundleForPdp[]> => {
    const { data } = await axiosInstance.get<{ bundles: StorefrontBundleForPdp[] }>(
      `${base}/storefront/by-product/${encodeURIComponent(productId)}`,
    );
    return data.bundles ?? [];
  },
};

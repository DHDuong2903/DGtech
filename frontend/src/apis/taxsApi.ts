import axiosInstance from "../lib/axios";
import { API_ROUTE } from "../constant";

export type TaxSettings = {
  enableTax: boolean;
  taxRate: number;
  taxIncluded: boolean;
};

export const taxsApi = {
  adminGetConfig: async (): Promise<{ settings: TaxSettings }> => {
    const { data } = await axiosInstance.get(`${API_ROUTE.TAXS}/admin/config`);
    return data;
  },
  adminPutConfig: async (body: { settings: Partial<TaxSettings> }): Promise<{ settings: TaxSettings }> => {
    const { data } = await axiosInstance.put(`${API_ROUTE.TAXS}/admin/config`, body);
    return data;
  },
};

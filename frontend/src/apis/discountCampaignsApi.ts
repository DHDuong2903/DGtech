import axiosInstance from "../lib/axios";
import { API_ROUTE } from "../constant";
import type {
  DiscountCampaign,
  DiscountCampaignFormPayload,
  DiscountCampaignVariantPriceRow,
} from "../types/discountCampaignType";

const base = API_ROUTE.DISCOUNT_CAMPAIGNS;

export const discountCampaignsApi = {
  getAll: async (): Promise<DiscountCampaign[]> => {
    const { data } = await axiosInstance.get<{ campaigns: DiscountCampaign[] }>(base);
    return data.campaigns ?? [];
  },

  getById: async (campaignId: string): Promise<DiscountCampaign> => {
    const { data } = await axiosInstance.get<{ campaign: DiscountCampaign }>(`${base}/${campaignId}`);
    return data.campaign;
  },

  getVariantPricesPage: async (
    campaignId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ variantPrices: DiscountCampaignVariantPriceRow[]; total: number; page: number; limit: number }> => {
    const { data } = await axiosInstance.get<{
      variantPrices: DiscountCampaignVariantPriceRow[];
      total: number;
      page: number;
      limit: number;
    }>(`${base}/${campaignId}/variant-prices`, { params });
    return {
      variantPrices: data.variantPrices ?? [],
      total: data.total ?? 0,
      page: data.page ?? 1,
      limit: data.limit ?? 100,
    };
  },

  create: async (payload: DiscountCampaignFormPayload): Promise<DiscountCampaign> => {
    const { data } = await axiosInstance.post<{ campaign: DiscountCampaign }>(base, payload);
    return data.campaign;
  },

  update: async (campaignId: string, payload: Partial<DiscountCampaignFormPayload>): Promise<DiscountCampaign> => {
    const { data } = await axiosInstance.put<{ campaign: DiscountCampaign }>(`${base}/${campaignId}`, payload);
    return data.campaign;
  },

  delete: async (campaignId: string): Promise<void> => {
    await axiosInstance.delete(`${base}/${campaignId}`);
  },
};

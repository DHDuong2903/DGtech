import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ApiError, DiscountCampaign, DiscountCampaignFormPayload } from "../types";
import { discountCampaignsApi } from "../apis/discountCampaignsApi";
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

interface DiscountCampaignState {
  campaigns: DiscountCampaign[];
  loading: boolean;
  error: string | null;

  fetchCampaigns: () => Promise<void>;
  createCampaign: (data: DiscountCampaignFormPayload) => Promise<{ success: boolean; error?: string }>;
  updateCampaign: (
    id: string,
    data: Partial<DiscountCampaignFormPayload>
  ) => Promise<{ success: boolean; error?: string }>;
  deleteCampaign: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteCampaigns: (ids: string[]) => Promise<{ success: boolean; error?: string }>;
}

function sortCampaigns(list: DiscountCampaign[]): DiscountCampaign[] {
  return [...list].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    return tb - ta;
  });
}

export const useDiscountCampaignStore = create<DiscountCampaignState>()(
  devtools(
    (set, get) => ({
      campaigns: [],
      loading: false,
      error: null,

      fetchCampaigns: async () => {
        set({ loading: true, error: null });
        try {
          const campaigns = sortCampaigns(await discountCampaignsApi.getAll());
          set({ campaigns, loading: false });
        } catch (err) {
          console.error(err);
          set({
            error: messageFromApiErr(err, "Could not load discount campaigns"),
            loading: false,
          });
        }
      },

      createCampaign: async (data) => {
        try {
          const created = await discountCampaignsApi.create(data);
          set((state) => ({
            campaigns: sortCampaigns([...state.campaigns.filter((c) => c.campaignId !== created.campaignId), created]),
            error: null,
          }));
          toast.success("Campaign created");
          return { success: true };
        } catch (err) {
          const msg = messageFromApiErr(err, "Failed to create campaign");
          set({ error: msg });
          toast.error(msg);
          return { success: false, error: msg };
        }
      },

      updateCampaign: async (id, data) => {
        try {
          const updated = await discountCampaignsApi.update(id, data);
          set((state) => ({
            campaigns: sortCampaigns(state.campaigns.map((c) => (c.campaignId === id ? updated : c))),
            error: null,
          }));
          toast.success("Campaign updated");
          return { success: true };
        } catch (err) {
          const msg = messageFromApiErr(err, "Failed to update campaign");
          set({ error: msg });
          toast.error(msg);
          return { success: false, error: msg };
        }
      },

      deleteCampaign: async (id) => {
        try {
          await discountCampaignsApi.delete(id);
          set((state) => ({
            campaigns: state.campaigns.filter((c) => c.campaignId !== id),
            error: null,
          }));
          toast.success("Campaign deleted");
          return { success: true };
        } catch (err) {
          const msg = messageFromApiErr(err, "Failed to delete campaign");
          set({ error: msg });
          toast.error(msg);
          return { success: false, error: msg };
        }
      },

      deleteCampaigns: async (ids) => {
        if (!ids.length) return { success: true };
        try {
          await Promise.all(ids.map((id) => discountCampaignsApi.delete(id)));
          set((state) => ({
            campaigns: state.campaigns.filter((c) => !ids.includes(c.campaignId)),
            error: null,
          }));
          toast.success(ids.length === 1 ? "Campaign deleted" : `${ids.length} campaigns deleted`);
          return { success: true };
        } catch (err) {
          const msg = messageFromApiErr(err, "Failed to delete one or more campaigns");
          set({ error: msg });
          toast.error(msg);
          await get().fetchCampaigns();
          return { success: false, error: msg };
        }
      },
    }),
    { name: "discount-campaigns" }
  )
);

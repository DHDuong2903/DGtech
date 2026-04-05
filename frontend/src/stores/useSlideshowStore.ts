import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ApiError, HeroSlide, SlideshowCampaign, SlideshowCampaignFormData } from "../types";
import { slideshowsApi } from "../apis/slideshowsApi";
import { toast } from "sonner";

interface SlideshowState {
  slideshows: SlideshowCampaign[];
  loading: boolean;
  error: string | null;

  fetchSlideshows: () => Promise<void>;
  createSlideshow: (data: SlideshowCampaignFormData) => Promise<{ success: boolean; error?: string }>;
  updateSlideshow: (
    id: number,
    data: { name?: string; slides?: HeroSlide[] }
  ) => Promise<{ success: boolean; error?: string }>;
  deleteSlideshow: (id: number) => Promise<{ success: boolean; error?: string }>;
  deleteSlideshows: (ids: number[]) => Promise<{ success: boolean; error?: string }>;
  activateSlideshow: (id: number) => Promise<{ success: boolean; error?: string }>;
  deactivateSlideshow: (id: number) => Promise<{ success: boolean; error?: string }>;
}

function sortSlideshows(list: SlideshowCampaign[]): SlideshowCampaign[] {
  return [...list].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  });
}

export const useSlideshowStore = create<SlideshowState>()(
  devtools(
    (set) => ({
      slideshows: [],
      loading: false,
      error: null,

      fetchSlideshows: async () => {
        set({ loading: true, error: null });
        try {
          const slideshows = sortSlideshows(await slideshowsApi.getAll());
          set({ slideshows, loading: false });
        } catch (err) {
          console.error(err);
          const error = err as ApiError;
          set({
            error: error.message || "Could not load slideshows",
            loading: false,
          });
        }
      },

      createSlideshow: async (data: SlideshowCampaignFormData) => {
        try {
          await slideshowsApi.create({
            name: data.name.trim(),
            slides: data.slides,
            activate: data.activate,
          });
          const slideshows = sortSlideshows(await slideshowsApi.getAll());
          set({ slideshows, error: null });
          toast.success("Slideshow created");
          return { success: true };
        } catch (err) {
          console.error(err);
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to create slideshow";
          set({ error: msg });
          toast.error(msg);
          return { success: false, error: msg };
        }
      },

      updateSlideshow: async (id, data) => {
        try {
          const updated = await slideshowsApi.update(id, data);
          set((state) => ({
            slideshows: sortSlideshows(state.slideshows.map((s) => (s.slideshowId === id ? updated : s))),
            error: null,
          }));
          toast.success("Slideshow updated");
          return { success: true };
        } catch (err) {
          console.error(err);
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to update slideshow";
          set({ error: msg });
          toast.error(msg);
          return { success: false, error: msg };
        }
      },

      deleteSlideshow: async (id) => {
        try {
          await slideshowsApi.delete(id);
          set((state) => ({
            slideshows: state.slideshows.filter((s) => s.slideshowId !== id),
            error: null,
          }));
          toast.success("Slideshow deleted");
          return { success: true };
        } catch (err) {
          console.error(err);
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to delete slideshow";
          set({ error: msg });
          toast.error(msg);
          return { success: false, error: msg };
        }
      },

      deleteSlideshows: async (ids) => {
        if (ids.length === 0) return { success: true };
        try {
          await Promise.all(ids.map((id) => slideshowsApi.delete(id)));
          set((state) => ({
            slideshows: state.slideshows.filter((s) => !ids.includes(s.slideshowId)),
            error: null,
          }));
          toast.success(ids.length === 1 ? "Slideshow deleted" : `Deleted ${ids.length} slideshows`);
          return { success: true };
        } catch (err) {
          console.error(err);
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Failed to delete slideshows";
          set({ error: msg });
          toast.error(msg);
          return { success: false, error: msg };
        }
      },

      activateSlideshow: async (id) => {
        try {
          const list = await slideshowsApi.activate(id);
          set({ slideshows: sortSlideshows(list), error: null });
          toast.success("Slideshow is now live on the storefront");
          return { success: true };
        } catch (err) {
          console.error(err);
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to activate";
          set({ error: msg });
          toast.error(msg);
          return { success: false, error: msg };
        }
      },

      deactivateSlideshow: async (id) => {
        try {
          const list = await slideshowsApi.deactivate(id);
          set({ slideshows: sortSlideshows(list), error: null });
          toast.success("Slideshow deactivated");
          return { success: true };
        } catch (err) {
          console.error(err);
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to deactivate";
          set({ error: msg });
          toast.error(msg);
          return { success: false, error: msg };
        }
      },
    }),
    { name: "SlideshowStore" }
  )
);

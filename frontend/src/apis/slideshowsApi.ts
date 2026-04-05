import axiosInstance from "../lib/axios";
import { API_ROUTE } from "../constant";
import type { HeroSlide, SlideshowCampaign } from "../types/slideshowsType";

const base = API_ROUTE.SLIDESHOWS;

export const slideshowsApi = {
  /** Storefront: slide của campaign đang active */
  getActiveSlides: async (): Promise<{ slides: HeroSlide[] }> => {
    const { data } = await axiosInstance.get<{ slides: HeroSlide[] }>(`${base}/active`);
    return data;
  },

  getAll: async (): Promise<SlideshowCampaign[]> => {
    const { data } = await axiosInstance.get<{ slideshows: SlideshowCampaign[] }>(base);
    return data.slideshows ?? [];
  },

  create: async (payload: {
    name: string;
    slides: HeroSlide[];
    activate?: boolean;
  }): Promise<SlideshowCampaign> => {
    const { data } = await axiosInstance.post<{ slideshow: SlideshowCampaign }>(base, payload);
    return data.slideshow;
  },

  update: async (
    slideshowId: number,
    payload: { name?: string; slides?: HeroSlide[] }
  ): Promise<SlideshowCampaign> => {
    const { data } = await axiosInstance.put<{ slideshow: SlideshowCampaign }>(`${base}/${slideshowId}`, payload);
    return data.slideshow;
  },

  delete: async (slideshowId: number): Promise<void> => {
    await axiosInstance.delete(`${base}/${slideshowId}`);
  },

  activate: async (slideshowId: number): Promise<SlideshowCampaign[]> => {
    const { data } = await axiosInstance.post<{ slideshows: SlideshowCampaign[] }>(
      `${base}/${slideshowId}/activate`
    );
    return data.slideshows ?? [];
  },

  deactivate: async (slideshowId: number): Promise<SlideshowCampaign[]> => {
    const { data } = await axiosInstance.post<{ slideshows: SlideshowCampaign[] }>(
      `${base}/${slideshowId}/deactivate`
    );
    return data.slideshows ?? [];
  },

  uploadImage: async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("image", file);
    const { data } = await axiosInstance.post<{ url: string }>(`${base}/upload-image`, fd);
    return data.url;
  },
};

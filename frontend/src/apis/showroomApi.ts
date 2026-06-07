import { API_ROUTE } from "../constant";
import axiosInstance from "../lib/axios";
import type {
  ShowroomScene,
  ShowroomSceneDetailResponse,
  ShowroomSceneSlot,
} from "../types";

export const showroomApi = {
  getScenes: async (): Promise<ShowroomScene[]> => {
    const { data } = await axiosInstance.get<{ message: string; scenes: ShowroomScene[] }>(
      `${API_ROUTE.SHOWROOM}/scenes`,
    );
    return data.scenes || [];
  },

  getSceneByKey: async (sceneKey: string): Promise<ShowroomSceneDetailResponse> => {
    const { data } = await axiosInstance.get<
      { message: string } & ShowroomSceneDetailResponse
    >(`${API_ROUTE.SHOWROOM}/scenes/${sceneKey}`);
    return {
      scene: data.scene,
      slots: data.slots || [],
      eligibleProducts: data.eligibleProducts || [],
    };
  },

  adminGetScenes: async () => {
    const { data } = await axiosInstance.get<{
      message: string;
      scenes: Array<ShowroomScene & { slots: ShowroomSceneSlot[] }>;
    }>(
      `${API_ROUTE.SHOWROOM}/admin/scenes`,
    );
    return data.scenes || [];
  },

  adminGetSceneById: async (sceneId: string) => {
    const { data } = await axiosInstance.get<{
      message: string;
      scene: ShowroomScene & { slots: ShowroomSceneSlot[] };
    }>(`${API_ROUTE.SHOWROOM}/admin/scenes/${sceneId}`);
    return data.scene;
  },

  adminCreateScene: async (payload: FormData) => {
    const { data } = await axiosInstance.post<{
      message: string;
      scene: ShowroomScene & { slots: ShowroomSceneSlot[] };
    }>(`${API_ROUTE.SHOWROOM}/admin/scenes`, payload, {
      timeout: 120_000,
    });
    return data.scene;
  },

  adminDeleteScene: async (sceneId: string) => {
    await axiosInstance.delete(`${API_ROUTE.SHOWROOM}/admin/scenes/${sceneId}`);
  },

  adminSaveScene: async (sceneId: string, payload: FormData) => {
    const { data } = await axiosInstance.put<{
      message: string;
      scene: ShowroomScene & { slots: ShowroomSceneSlot[] };
    }>(`${API_ROUTE.SHOWROOM}/admin/scenes/${sceneId}`, payload, {
      timeout: 120_000,
    });
    return data.scene;
  },

  adminUpdateSlot: async (
    sceneId: string,
    slotId: string,
    payload: { allowedCategoryId: number | null; isActive: boolean },
  ): Promise<ShowroomSceneSlot> => {
    const { data } = await axiosInstance.put<{ message: string; slot: ShowroomSceneSlot }>(
      `${API_ROUTE.SHOWROOM}/admin/scenes/${sceneId}/slots/${slotId}`,
      payload,
    );
    return data.slot;
  },
};

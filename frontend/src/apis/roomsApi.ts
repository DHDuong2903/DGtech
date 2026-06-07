import { API_ROUTE } from "../constant";
import axiosInstance from "../lib/axios";
import type { Room } from "../types";

export const roomsApi = {
  getAll: async (): Promise<Room[]> => {
    const response = await axiosInstance.get<{ message: string; rooms: Room[] }>(API_ROUTE.ROOMS);
    return response.data.rooms || [];
  },

  create: async (roomData: { name: string; description: string }): Promise<Room> => {
    const response = await axiosInstance.post<{ message: string; newRoom: Room }>(API_ROUTE.ROOMS, roomData);
    return response.data.newRoom;
  },

  update: async (id: number, roomData: { name: string; description: string }): Promise<Room> => {
    const response = await axiosInstance.put<{ message: string; room: Room }>(`${API_ROUTE.ROOMS}/${id}`, roomData);
    return response.data.room;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${API_ROUTE.ROOMS}/${id}`);
  },
};

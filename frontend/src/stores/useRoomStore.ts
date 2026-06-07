import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { toast } from "sonner";
import { roomsApi } from "../apis";
import type { ApiError, Room, RoomFormData } from "../types";

interface RoomState {
  rooms: Room[];
  loading: boolean;
  error: string | null;
  lastLoadedAt: number | null;
  fetchRooms: (options?: { force?: boolean }) => Promise<void>;
  createRoom: (data: RoomFormData) => Promise<{ success: boolean; data?: Room; error?: string }>;
  updateRoom: (id: number, data: RoomFormData) => Promise<{ success: boolean; data?: Room; error?: string }>;
  deleteRoom: (id: number) => Promise<{ success: boolean; error?: string }>;
  deleteRooms: (ids: number[]) => Promise<{ success: boolean; error?: string }>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useRoomStore = create<RoomState>()(
  devtools(
    (set) => ({
      rooms: [],
      loading: false,
      error: null,
      lastLoadedAt: null,

      fetchRooms: async (options) => {
        const force = options?.force === true;
        const state = useRoomStore.getState();
        const cacheFresh = state.lastLoadedAt != null && Date.now() - state.lastLoadedAt < 5 * 60 * 1000 && state.rooms.length > 0;
        if (!force && (state.loading || cacheFresh)) {
          return;
        }

        set({ loading: true, error: null });
        try {
          const rooms = await roomsApi.getAll();
          set({ rooms, loading: false, lastLoadedAt: Date.now() });
        } catch (err) {
          console.error("Error fetching rooms:", err);
          const error = err as ApiError;
          set({ error: error.message || "Could not load rooms", loading: false });
        }
      },

      createRoom: async (data) => {
        try {
          const newRoom = await roomsApi.create(data);
          set((state) => ({
            rooms: [...state.rooms, newRoom],
            error: null,
            lastLoadedAt: Date.now(),
          }));
          toast.success("Room created");
          return { success: true, data: newRoom };
        } catch (err) {
          console.error("Error creating room:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to create room";
          set({ error: errorMessage });
          toast.error("Could not create room");
          return { success: false, error: errorMessage };
        }
      },

      updateRoom: async (id, data) => {
        try {
          const room = await roomsApi.update(id, data);
          set((state) => ({
            rooms: state.rooms.map((item) => (item.roomId === id ? room : item)),
            error: null,
            lastLoadedAt: Date.now(),
          }));
          toast.success("Room updated");
          return { success: true, data: room };
        } catch (err) {
          console.error("Error updating room:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to update room";
          set({ error: errorMessage });
          toast.error("Could not update room");
          return { success: false, error: errorMessage };
        }
      },

      deleteRoom: async (id) => {
        try {
          await roomsApi.delete(id);
          set((state) => ({
            rooms: state.rooms.filter((item) => item.roomId !== id),
            error: null,
            lastLoadedAt: Date.now(),
          }));
          toast.success("Room deleted");
          return { success: true };
        } catch (err) {
          console.error("Error deleting room:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to delete room";
          set({ error: errorMessage });
          toast.error("Could not delete room");
          return { success: false, error: errorMessage };
        }
      },

      deleteRooms: async (ids) => {
        if (ids.length === 0) return { success: true };
        try {
          await Promise.all(ids.map((id) => roomsApi.delete(id)));
          set((state) => ({
            rooms: state.rooms.filter((item) => !ids.includes(item.roomId)),
            error: null,
            lastLoadedAt: Date.now(),
          }));
          toast.success(ids.length === 1 ? "Room deleted" : `Deleted ${ids.length} rooms`);
          return { success: true };
        } catch (err) {
          console.error("Error bulk deleting rooms:", err);
          const error = err as ApiError;
          const errorMessage = error.message || "Failed to delete rooms";
          set({ error: errorMessage });
          toast.error("Could not delete selected rooms");
          return { success: false, error: errorMessage };
        }
      },

      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    { name: "RoomStore" },
  ),
);

import { API_ROUTE } from "../constant";
import axiosInstance from "../lib/axios";
import type { UserAddress, UserAddressPayload } from "../types";

export const addressApi = {
  list: async (): Promise<{ addresses: UserAddress[] }> => {
    const res = await axiosInstance.get(API_ROUTE.ADDRESSES);
    return res.data;
  },

  create: async (body: UserAddressPayload): Promise<{ address: UserAddress }> => {
    const res = await axiosInstance.post(API_ROUTE.ADDRESSES, body);
    return res.data;
  },

  update: async (addressId: string, body: UserAddressPayload): Promise<{ address: UserAddress }> => {
    const res = await axiosInstance.put(`${API_ROUTE.ADDRESSES}/${addressId}`, body);
    return res.data;
  },

  remove: async (addressId: string): Promise<{ message: string }> => {
    const res = await axiosInstance.delete(`${API_ROUTE.ADDRESSES}/${addressId}`);
    return res.data;
  },

  setDefault: async (addressId: string): Promise<{ address: UserAddress }> => {
    const res = await axiosInstance.patch(`${API_ROUTE.ADDRESSES}/${addressId}/default`);
    return res.data;
  },
};

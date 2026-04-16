import { API_ROUTE } from "../constant";
import axiosInstance from "../lib/axios";

export type ShippingQuoteOptionDTO = {
  code: string;
  name: string;
  customerEtaNote: string;
  baseZoneFee: number;
  shippingFee: number;
  totalPrice: number;
  freeShippingApplied: boolean;
  shippingLabel: string;
  displayMode: "separate" | "included";
};

export type ShippingQuoteResponse = {
  subtotal: number;
  zoneId: string | null;
  zoneName: string | null;
  zoneKey: string | null;
  provinceCode: string;
  displayMode: "separate" | "included";
  options: ShippingQuoteOptionDTO[];
  defaultMethodCode: string;
  knownMethodCodes?: string[];
};

export type BasicZoneMethodRow = {
  code: string;
  name: string;
  flatAmount: number;
  enabled: boolean;
  customerEtaNote: string;
  sortOrder: number;
};

export type BasicZoneRow = {
  zoneId: string;
  zoneKey: string;
  name: string;
  sortOrder: number;
  provinces: { provinceCode: string; provinceName: string }[];
  methods: BasicZoneMethodRow[];
};

export type BasicSettings = {
  displayMode: "separate" | "included";
  freeShippingEnabled: boolean;
  freeShippingMinSubtotal: number;
  fallbackShippingAmount: number;
  freeShippingStandardOnly: boolean;
  showFreeShippingProgressInCart: boolean;
};

export type BasicConfigResponse = {
  zones: BasicZoneRow[];
  settings: BasicSettings;
};

export const shippingApi = {
  quote: async (body: {
    selectedItems: string[];
    provinceCode: string;
  }): Promise<ShippingQuoteResponse> => {
    const { data } = await axiosInstance.post(`${API_ROUTE.SHIPPING}/quote`, body);
    return data;
  },

  adminGetBasicConfig: async (): Promise<BasicConfigResponse> => {
    const { data } = await axiosInstance.get(`${API_ROUTE.SHIPPING}/admin/basic-config`);
    return data;
  },

  adminPutBasicConfig: async (body: {
    zones?: {
      zoneKey: string;
      flatAmount?: number;
      methods?: {
        code: string;
        name?: string;
        flatAmount: number;
        enabled?: boolean;
        customerEtaNote?: string;
        sortOrder?: number;
      }[];
    }[];
    settings?: Partial<BasicSettings>;
  }): Promise<BasicConfigResponse> => {
    const { data } = await axiosInstance.put(`${API_ROUTE.SHIPPING}/admin/basic-config`, body);
    return data;
  },
};

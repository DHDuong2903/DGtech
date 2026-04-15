export interface VnProvince {
  provinceCode: string;
  provinceName: string;
}

export interface VnWard {
  provinceCode: string;
  wardCode: string;
  wardName: string;
}

export interface UserAddress {
  addressId: string;
  clerkId: string;
  phone: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  addressLine: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAddressPayload {
  phone: string;
  provinceCode: string;
  wardCode: string;
  addressLine: string;
  isDefault?: boolean;
}

/** Matches backend formatShippingSnapshot for one-off checkout without saved id. */
export function formatCheckoutShippingSnapshot(input: {
  displayName: string;
  phone: string;
  addressLine: string;
  wardName: string;
  provinceName: string;
}) {
  return `${input.displayName} | ${input.phone} | ${input.addressLine}, ${input.wardName}, ${input.provinceName}`;
}

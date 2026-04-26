export type VoucherType = "PERCENT_DISCOUNT" | "FIXED_DISCOUNT" | "FREE_SHIPPING" | "BONUS_POINTS";
export type VoucherAudience = "ALL_USERS" | "TIER_USERS";
export type VoucherTierOption = "bronze" | "silver" | "gold";

export type Voucher = {
  voucherId: string;
  name: string;
  voucherType: VoucherType;
  audience: VoucherAudience;
  tierTargets: VoucherTierOption[];
  discountPercent: number;
  discountAmount: number;
  maxUsesPerUser: number;
  expiresAt: string | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type VoucherFormPayload = {
  name: string;
  voucherType: VoucherType;
  audience: VoucherAudience;
  tierTargets: VoucherTierOption[];
  discountPercent: number;
  discountAmount: number;
  maxUsesPerUser: number;
  expiresAt: string | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
};

export type EligibleVoucher = Voucher & {
  estimatedSavings: number;
  usedCount: number;
  remainingUses: number;
};

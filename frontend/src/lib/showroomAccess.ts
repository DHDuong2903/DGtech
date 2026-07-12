import type { UserRank } from "@/src/types";

export const SHOWROOM_GOLD_REQUIRED_TOAST = "Gold membership is required to access the 3D Showroom";
export const SHOWROOM_SIGN_IN_REQUIRED_TOAST = "Please sign in to access the 3D Showroom";

export function isGoldRank(rank: UserRank | null | undefined, clerkMetadataRank?: string | null): boolean {
  if (rank?.currentRank === "gold") return true;
  return typeof clerkMetadataRank === "string" && clerkMetadataRank.trim().toLowerCase() === "gold";
}

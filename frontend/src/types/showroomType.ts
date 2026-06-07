import type { Product } from "./productType";

export interface ShowroomScene {
  sceneId: string;
  sceneKey: string;
  name: string;
  roomId?: number | null;
  room?: {
    roomId: number;
    name: string;
    description: string;
  } | null;
  roomModelUrl?: string | null;
  roomModelPublicId?: string | null;
  roomModelMimeType?: string | null;
  roomModelFileName?: string | null;
  roomModelSizeBytes?: number | null;
  thumbnailUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  isReadyForStorefront: boolean;
  positionsCount?: number;
}

export interface ShowroomSceneSlot {
  slotId: string;
  sceneId: string;
  slotCode: string;
  label: string;
  allowedCategoryId: number | null;
  allowedCategory?: {
    categoryId: number;
    name: string;
  } | null;
  anchorPosition: [number, number, number];
  anchorRotation: [number, number, number];
  anchorScale: [number, number, number];
  cameraFocus: [number, number, number];
  isActive: boolean;
}

export interface ShowroomEligibleProduct extends Product {
  model3dUrl: string;
  showroomEligible: true;
}

export interface ShowroomSceneDetailResponse {
  scene: ShowroomScene;
  slots: ShowroomSceneSlot[];
  eligibleProducts: ShowroomEligibleProduct[];
}

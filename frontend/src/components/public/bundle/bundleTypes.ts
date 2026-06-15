export type BundleLineRow = {
  id: string;
  imageUrl?: string | null;
  model3dUrl?: string | null;
  name: string;
  attributes?: Record<string, string> | null;
  quantity: number;
  href?: string | null;
};

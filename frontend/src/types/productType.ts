// Product Types
export type ProductStatus = "ACTIVE" | "DRAFT";

export interface ProductVariant {
  variantId?: string;
  productId?: string;
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  attributes: Record<string, string>;
  isDefault: boolean;
}

export interface Product {
  productId: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  imageUrl?: string;
  model3dUrl?: string | null;
  model3dPublicId?: string | null;
  model3dMimeType?: string | null;
  model3dFileName?: string | null;
  model3dSizeBytes?: number | null;
  showroomEligible?: boolean;
  categoryId: number;
  status: ProductStatus;
  category?: {
    categoryId: number;
    name: string;
  };
  variants?: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: number;
  status: ProductStatus;
  image?: File;
  model3d?: File;
}

export type ProductCreateData = Omit<Product, "productId" | "createdAt" | "updatedAt" | "category">;

export type ProductUpdateData = Partial<ProductCreateData>;

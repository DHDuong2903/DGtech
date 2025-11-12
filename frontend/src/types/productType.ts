// Product Types
export interface Product {
  productId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  categoryId: number;
  category?: {
    categoryId: number;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: number;
  image?: File;
}

export type ProductCreateData = Omit<Product, 'productId' | 'createdAt' | 'updatedAt' | 'category'>;

export type ProductUpdateData = Partial<ProductCreateData>;

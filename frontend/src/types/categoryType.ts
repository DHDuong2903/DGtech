// Category Types
export interface Category {
  categoryId: number;
  name: string;
  description: string;
  isActiveOnHomepage?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryFormData {
  name: string;
  description: string;
}

export type CategoryCreateData = Omit<Category, 'categoryId' | 'createdAt' | 'updatedAt'>;

export type CategoryUpdateData = Omit<Category, 'categoryId' | 'createdAt' | 'updatedAt'>;

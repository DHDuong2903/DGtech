"use client";

import { useEffect } from "react";
import { useCategoryStore, useProductStore } from "../stores";

/**
 * Store Initializer Component
 * Initializes global stores on app mount
 * Fetches public data (categories and products) once when app starts
 */
export const StoreInitializer = ({ children }: { children: React.ReactNode }) => {
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);
  const fetchProducts = useProductStore((state) => state.fetchProducts);

  useEffect(() => {
    // Fetch public data once when app starts
    fetchCategories(); // For CategoryStore (single source of truth for categories)
    fetchProducts(); // For ProductStore
  }, [fetchCategories, fetchProducts]);

  return <>{children}</>;
};

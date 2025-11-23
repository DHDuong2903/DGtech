"use client";

import { useEffect } from "react";
import { useCategoryStore, useProductStore } from "../stores";

export const StoreInitializer = ({ children }: { children: React.ReactNode }) => {
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);
  const fetchProducts = useProductStore((state) => state.fetchProducts);

  useEffect(() => {
    // Fetch public data once when app starts
    fetchCategories(); // For CategoryStore
    fetchProducts(); // For ProductStore
  }, [fetchCategories, fetchProducts]);

  return <>{children}</>;
};

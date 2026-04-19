"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useCategoryStore, useProductStore } from "../stores";

export const StoreInitializer = ({ children }: { children: React.ReactNode }) => {
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const { isSignedIn, isLoaded } = useAuth();
  const wasSignedInRef = useRef(false);

  useEffect(() => {
    // Fetch public data once when app starts
    fetchCategories(); // For CategoryStore
    fetchProducts(); // For ProductStore
  }, [fetchCategories, fetchProducts]);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      if (!wasSignedInRef.current) {
        wasSignedInRef.current = true;
        void fetchProducts();
      }
    } else if (wasSignedInRef.current) {
      wasSignedInRef.current = false;
      void fetchProducts();
    }
  }, [isLoaded, isSignedIn, fetchProducts]);

  return <>{children}</>;
};

"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useCategoryStore } from "../stores";

export const StoreInitializer = ({ children }: { children: React.ReactNode }) => {
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);
  const { isLoaded } = useAuth();
  const didInitRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || didInitRef.current) return;
    didInitRef.current = true;
    void fetchCategories();
  }, [fetchCategories, isLoaded]);

  return <>{children}</>;
};

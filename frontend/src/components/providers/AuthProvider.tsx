"use client";

import React from "react";
import { useAuth } from "../../hooks/useAuth";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Hook này sẽ tự động fetch user data khi component mount
  useAuth();

  return <>{children}</>;
};

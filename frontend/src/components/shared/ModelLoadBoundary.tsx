"use client";

import { Component, type ReactNode } from "react";

type ModelLoadBoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
  onError?: (error: Error) => void;
};

type ModelLoadBoundaryState = {
  hasError: boolean;
};

export class ModelLoadBoundary extends Component<ModelLoadBoundaryProps, ModelLoadBoundaryState> {
  state: ModelLoadBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

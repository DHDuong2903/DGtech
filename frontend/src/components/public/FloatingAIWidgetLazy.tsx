"use client";

import dynamic from "next/dynamic";

const FloatingAIWidget = dynamic(
  () => import("./FloatingAIWidget").then((mod) => mod.FloatingAIWidget),
  { ssr: false },
);

export function FloatingAIWidgetLazy() {
  return <FloatingAIWidget />;
}

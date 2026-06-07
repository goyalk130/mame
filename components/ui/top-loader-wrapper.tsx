"use client";
import { Suspense } from "react";
import { TopLoader } from "./top-loader";

export function TopLoaderWrapper() {
  return (
    <Suspense fallback={null}>
      <TopLoader />
    </Suspense>
  );
}

"use client";
import { Suspense } from "react";
import { NavLoader } from "./nav-loader";

export function NavLoaderWrapper() {
  return (
    <Suspense fallback={null}>
      <NavLoader />
    </Suspense>
  );
}

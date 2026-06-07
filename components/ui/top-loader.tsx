"use client";
/**
 * TopLoader — fires instantly on link/button click, finishes when the route settles.
 * Starts on mousedown (perceived instant), stops on pathname change.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const activeRef = useRef(false);

  const start = useCallback(() => {
    if (activeRef.current) return; // already running
    activeRef.current = true;
    clearInterval(intervalRef.current);
    clearTimeout(timeoutRef.current);
    setVisible(true);
    setProgress(15);

    let p = 15;
    intervalRef.current = setInterval(() => {
      const increment = Math.max(0.5, (85 - p) * 0.06);
      p = Math.min(85, p + increment);
      setProgress(p);
    }, 150);
  }, []);

  const finish = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearInterval(intervalRef.current);
    setProgress(100);
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 350);
  }, []);

  // Finish when route actually changes
  useEffect(() => {
    finish();
  }, [pathname, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start instantly on any anchor/button mousedown
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";
      // Only internal links, skip anchors (#), external, and download links
      if (
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto") ||
        anchor.hasAttribute("download") ||
        anchor.target === "_blank"
      ) return;

      // Don't start if already on that page
      const dest = href.split("?")[0];
      if (dest === pathname) return;

      start();
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [pathname, start]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none">
      <div
        className="h-full bg-blue-500"
        style={{
          width: `${progress}%`,
          boxShadow: "0 0 6px rgba(59,130,246,0.7)",
          transition: progress === 100
            ? "width 150ms ease-out"
            : "width 150ms linear",
        }}
      />
    </div>
  );
}

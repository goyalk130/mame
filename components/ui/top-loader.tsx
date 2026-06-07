"use client";
/**
 * TopLoader — thin progress bar at the top of the page.
 * Fires on every client-side navigation by watching pathname + searchParams changes.
 * No external library needed.
 */
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const interval = useRef<ReturnType<typeof setInterval>>();

  function start() {
    clearTimeout(timer.current);
    clearInterval(interval.current);
    setProgress(0);
    setVisible(true);

    // Quickly jump to 20%, then slowly creep toward 90%
    setTimeout(() => setProgress(20), 50);
    let p = 20;
    interval.current = setInterval(() => {
      // Slow down as we approach 90
      const increment = Math.max(1, (90 - p) * 0.08);
      p = Math.min(90, p + increment);
      setProgress(p);
    }, 200);
  }

  function finish() {
    clearInterval(interval.current);
    setProgress(100);
    timer.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 400);
  }

  // Fire on route changes
  useEffect(() => {
    finish();
  }, [pathname, searchParams]);

  // Fire start on mount (covers the initial load flicker)
  useEffect(() => {
    start();
    return () => {
      clearTimeout(timer.current);
      clearInterval(interval.current);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      style={{ background: "transparent" }}
    >
      <div
        className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? "200ms" : "300ms",
          transitionTimingFunction: progress === 100 ? "ease-out" : "ease-in-out",
        }}
      />
    </div>
  );
}

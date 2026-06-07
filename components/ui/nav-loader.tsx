"use client";
import { useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);
  const [fading, setFading] = useState(false);

  const hide = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setShow(false);
      setFading(false);
    }, 250);
  }, []);

  // Hide when route settles
  useEffect(() => {
    hide();
  }, [pathname, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show instantly on any internal link click
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) return;
      const dest = href.split("?")[0];
      if (dest === pathname) return;
      setFading(false);
      setShow(true);
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [pathname]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 250ms ease",
      }}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
          <span className="text-white font-bold text-2xl select-none">M</span>
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-blue-400"
              style={{
                animation: "navbounce 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes navbounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

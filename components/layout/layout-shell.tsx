"use client";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import type { Project } from "@/types";

interface LayoutShellProps {
  projects: Project[];
  currentProject?: Project;
  user: { id: string; email: string; full_name?: string | null };
  children: React.ReactNode;
}

export function LayoutShell({ projects, currentProject, user, children }: LayoutShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Mobile top bar (hidden on lg+) ── */}
      <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#1d2125] border-b border-gray-700 shrink-0 z-30">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-gray-300 hover:text-white transition-colors p-0.5"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-xs shrink-0">
            M
          </div>
          <span className="text-white text-sm font-semibold truncate">
            {currentProject ? currentProject.name : "Mame"}
          </span>
        </div>
      </div>

      {/* ── Content row ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Desktop sidebar — always visible on lg+ */}
        <div className="hidden lg:flex lg:shrink-0">
          <Sidebar projects={projects} currentProject={currentProject} user={user} />
        </div>

        {/* Mobile sidebar drawer */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
              <Sidebar
                projects={projects}
                currentProject={currentProject}
                user={user}
                onClose={() => setMobileOpen(false)}
              />
            </div>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-gray-50 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

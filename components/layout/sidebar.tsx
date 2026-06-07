"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutGrid, List, ArrowLeft, Settings, LogOut, ChevronDown, Plus, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/types";
import toast from "react-hot-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SidebarProps {
  projects: Project[];
  currentProject?: Project;
  user: { id: string; email: string; full_name?: string | null };
}

export function Sidebar({ projects, currentProject, user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = (user.full_name || user.email)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className={cn("flex flex-col h-full bg-[#1d2125] text-gray-300 transition-all duration-200", collapsed ? "w-14" : "w-56")}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700">
        <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-sm shrink-0">M</div>
        {!collapsed && <span className="font-semibold text-white text-sm">Mame</span>}
      </div>

      {/* Project context */}
      {currentProject && (
        <div className="px-3 py-2 border-b border-gray-700">
          {!collapsed && (
            <div className="text-xs text-gray-500 mb-1">Current project</div>
          )}
          <div className="flex items-center gap-2 truncate">
            <div className="w-6 h-6 bg-blue-600 rounded text-white text-xs font-bold flex items-center justify-center shrink-0">
              {currentProject.key[0]}
            </div>
            {!collapsed && (
              <span className="text-sm text-white font-medium truncate">{currentProject.name}</span>
            )}
          </div>
          {!collapsed && (
            <nav className="mt-2 space-y-0.5">
              <NavItem href={`/projects/${currentProject.key}/board`} icon={<LayoutGrid size={14} />} label="Board" pathname={pathname} collapsed={collapsed} />
              {currentProject.type === "scrum" && (
                <NavItem href={`/projects/${currentProject.key}/backlog`} icon={<List size={14} />} label="Backlog" pathname={pathname} collapsed={collapsed} />
              )}
              <NavItem href={`/projects/${currentProject.key}/issues`} icon={<List size={14} />} label="Issues" pathname={pathname} collapsed={collapsed} />
              <NavItem href={`/projects/${currentProject.key}/status`} icon={<BarChart2 size={14} />} label="Status" pathname={pathname} collapsed={collapsed} />
              <NavItem href={`/projects/${currentProject.key}/settings`} icon={<Settings size={14} />} label="Settings" pathname={pathname} collapsed={collapsed} />
            </nav>
          )}
        </div>
      )}

      {/* All projects */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {!collapsed && (
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Projects</span>
            <Link href="/" className="text-gray-500 hover:text-white">
              <Plus size={14} />
            </Link>
          </div>
        )}
        <div className="space-y-0.5">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.key}/board`}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors hover:bg-gray-700",
                currentProject?.id === p.id ? "bg-gray-700 text-white" : "text-gray-400"
              )}
            >
              <div className="w-5 h-5 bg-blue-600 rounded text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {p.key[0]}
              </div>
              {!collapsed && <span className="truncate">{p.name}</span>}
            </Link>
          ))}
        </div>
      </div>

      {/* User + back to projects */}
      <div className="border-t border-gray-700 p-3 space-y-1">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
            <ArrowLeft size={14} />
            <span>All projects</span>
          </Link>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
        >
          <LogOut size={14} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar className="w-6 h-6">
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <span className="text-xs text-gray-400 truncate">{user.full_name || user.email}</span>
          )}
        </div>
      </div>
    </aside>
  );
}

function NavItem({ href, icon, label, pathname, collapsed }: { href: string; icon: React.ReactNode; label: string; pathname: string; collapsed: boolean }) {
  const active = pathname === href || pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
        active ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-700 hover:text-white"
      )}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

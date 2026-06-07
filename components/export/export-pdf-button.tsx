"use client";
/**
 * ExportPdfButton
 * Dynamically imports @react-pdf/renderer (client-only) to avoid SSR issues.
 * On click: fetches all project data, renders the PDF, triggers download.
 */
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import type { ProjectPdfData } from "./project-pdf";

interface Props {
  projectId: string;
  projectKey: string;
  projectName: string;
  projectType: string;
}

export function ExportPdfButton({ projectId, projectKey, projectName, projectType }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    const toastId = toast.loading("Building PDF…");

    try {
      const supabase = createClient();

      // Fetch all data in parallel
      const [issuesRes, sprintsRes, membersRes, vmRes, ownerRes] = await Promise.all([
        supabase
          .from("issues")
          .select("*, assignee:profiles!assignee_id(full_name, email), virtual_assignee:virtual_members!virtual_assignee_id(name, color)")
          .eq("project_id", projectId)
          .order("created_at"),
        supabase.from("sprints").select("*").eq("project_id", projectId).order("created_at"),
        supabase.from("project_members").select("*, profile:profiles(full_name, email)").eq("project_id", projectId),
        supabase.from("virtual_members").select("*").eq("project_id", projectId).order("created_at"),
        supabase.from("projects").select("owner_id").eq("id", projectId).single(),
      ]);

      // Get owner profile
      let ownerProfile: { id: string; full_name?: string; email?: string } | null = null;
      const ownerData = ownerRes.data as any;
      if (ownerData?.owner_id) {
        const { data } = await supabase.from("profiles").select("id, full_name, email").eq("id", ownerData.owner_id).single();
        ownerProfile = data as any;
      }

      // Merge owner into members (dedupe)
      const rawMembers = (membersRes.data as any[]) || [];
      const allMembers = [
        ...(ownerProfile ? [{ user_id: ownerProfile.id, profile: ownerProfile }] : []),
        ...rawMembers.filter((m: any) => m.user_id !== ownerProfile?.id),
      ];

      const data: ProjectPdfData = {
        project: { name: projectName, key: projectKey, type: projectType },
        issues: issuesRes.data || [],
        sprints: sprintsRes.data || [],
        members: allMembers,
        virtualMembers: vmRes.data || [],
        exportedAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      };

      // Dynamic import — keeps bundle clean and avoids SSR crash
      const [{ pdf }, { ProjectPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./project-pdf"),
      ]);

      const blob = await pdf(<ProjectPdfDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectKey}-export-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleExport}
      disabled={loading}
      className="gap-1.5"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      {loading ? "Building…" : "Export PDF"}
    </Button>
  );
}

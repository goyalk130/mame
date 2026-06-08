"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, LayoutGrid, Kanban, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/types";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

interface Props {
  projects: Project[];
  userId: string;
}

export function ProjectsHome({ projects: initial, userId }: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"scrum" | "kanban">("scrum");
  const [loading, setLoading] = useState(false);

  function generateKey(name: string) {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 5) || "PROJ";
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;
    setLoading(true);
    const supabase = createClient();

    // Try the key as-is; if duplicate, append a random 2-char suffix and retry once
    let finalKey = key.trim().toUpperCase();
    let { data, error } = await supabase
      .from("projects")
      .insert({ name: name.trim(), key: finalKey, description: description.trim() || null, type, owner_id: userId })
      .select()
      .single();

    if (error?.code === "23505") {
      // Unique key conflict — append random suffix and retry
      finalKey = finalKey.slice(0, 4) + Math.random().toString(36).slice(2, 4).toUpperCase();
      ({ data, error } = await supabase
        .from("projects")
        .insert({ name: name.trim(), key: finalKey, description: description.trim() || null, type, owner_id: userId })
        .select()
        .single());
    }

    if (error) {
      toast.error(error.code === "23505" ? `Key "${finalKey}" is already taken — please choose a different key` : error.message);
      setLoading(false);
      return;
    }

    await supabase.from("project_members").insert({ project_id: data.id, user_id: userId, role: "admin" });
    toast.success("Project created!");
    setProjects((prev) => [data, ...prev]);
    setOpen(false);
    setName(""); setKey(""); setDescription(""); setType("scrum");
    setLoading(false);
    router.push(`/projects/${data.key}/board`);
  }

  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteProject) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("projects").delete().eq("id", deleteProject.id);
    if (error) { toast.error(error.message); setDeleting(false); return; }
    setProjects((prev) => prev.filter((p) => p.id !== deleteProject.id));
    setDeleteProject(null);
    setDeleting(false);
    toast.success("Project deleted");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Manage your projects and track work</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus size={16} />
          Create project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <LayoutGrid className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No projects yet</h3>
          <p className="text-gray-500 mb-6">Create your first project to get started</p>
          <Button onClick={() => setOpen(true)}>Create project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="group relative bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <Link href={`/projects/${project.key}/board`} className="absolute inset-0" />
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded text-white text-sm font-bold flex items-center justify-center">
                    {project.key[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{project.name}</div>
                    <div className="text-xs text-gray-400">{project.key}</div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); setDeleteProject(project); }}
                  className="relative z-10 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {project.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{project.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  {project.type === "kanban" ? <Kanban size={12} /> : <LayoutGrid size={12} />}
                  {project.type === "scrum" ? "Scrum" : "Kanban"}
                </span>
                <span>{formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>Set up a new project for your team</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project name *</label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); if (!key) setKey(generateKey(e.target.value)); }}
                placeholder="My awesome project"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project key *</label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                placeholder="PROJ"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Used as prefix for issues (e.g. PROJ-1)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project about?"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project type</label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scrum">Scrum (sprints + backlog)</SelectItem>
                  <SelectItem value="kanban">Kanban (continuous flow)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Creating..." : "Create project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete project confirm */}
      <Dialog open={!!deleteProject} onOpenChange={(o) => !o && setDeleteProject(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              This will permanently delete <span className="font-semibold text-gray-900">"{deleteProject?.name}"</span> and all its issues, sprints, and data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteProject(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button onClick={confirmDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? "Deleting…" : "Delete project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

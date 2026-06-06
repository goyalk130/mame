"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  project: Project;
  members: any[];
  userId: string;
}

export function ProjectSettings({ project, members: initialMembers, userId }: Props) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [type, setType] = useState(project.type);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const supabase = createClient();

  async function saveProject(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("projects")
      .update({ name, description: description || null, type, updated_at: new Date().toISOString() })
      .eq("id", project.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Settings saved");
    setSaving(false);
    router.refresh();
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    // Find user by email
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", inviteEmail.trim())
      .single();
    if (error || !profile) {
      toast.error("User not found. They must have an account first.");
      setInviting(false);
      return;
    }
    if (members.find((m) => m.user_id === profile.id)) {
      toast.error("User is already a member");
      setInviting(false);
      return;
    }
    const { data, error: memberError } = await supabase
      .from("project_members")
      .insert({ project_id: project.id, user_id: profile.id, role: "member" })
      .select("*, profile:profiles(*)")
      .single();
    if (memberError) { toast.error(memberError.message); setInviting(false); return; }
    setMembers((prev) => [...prev, data]);
    setInviteEmail("");
    setInviting(false);
    toast.success("Member added!");
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member?")) return;
    const { error } = await supabase.from("project_members").delete().eq("id", memberId);
    if (error) { toast.error(error.message); return; }
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    toast.success("Member removed");
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-8">Project Settings</h1>

      {/* General settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">General</h2>
        <form onSubmit={saveProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project key</label>
            <Input value={project.key} disabled className="bg-gray-50 text-gray-500" />
            <p className="text-xs text-gray-400 mt-1">Project key cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project type</label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scrum">Scrum</SelectItem>
                <SelectItem value="kanban">Kanban</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
        </form>
      </div>

      {/* Members */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Members</h2>
        <form onSubmit={inviteMember} className="flex gap-2 mb-4">
          <Input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1"
          />
          <Button type="submit" disabled={inviting} className="gap-1.5">
            <UserPlus size={14} />
            {inviting ? "Adding..." : "Add member"}
          </Button>
        </form>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {(m.profile?.full_name || m.profile?.email || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium text-gray-900">{m.profile?.full_name || m.profile?.email}</div>
                  <div className="text-xs text-gray-400">{m.profile?.email} · {m.role}</div>
                </div>
              </div>
              {m.user_id !== project.owner_id && m.user_id !== userId && (
                <button onClick={() => removeMember(m.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              )}
              {m.user_id === project.owner_id && (
                <span className="text-xs text-gray-400">Owner</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      {userId === project.owner_id && (
        <div className="bg-white border border-red-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-red-600 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-600 mb-4">Permanently delete this project and all its issues, sprints, and data.</p>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!confirm(`Delete "${project.name}"? This CANNOT be undone.`)) return;
              const { error } = await supabase.from("projects").delete().eq("id", project.id);
              if (error) { toast.error(error.message); return; }
              toast.success("Project deleted");
              router.push("/");
            }}
          >
            Delete project
          </Button>
        </div>
      )}
    </div>
  );
}

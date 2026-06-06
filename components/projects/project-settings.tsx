"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Project, VirtualMember } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, UserPlus, Users } from "lucide-react";
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
  const [virtualMembers, setVirtualMembers] = useState<VirtualMember[]>([]);
  const [vmName, setVmName] = useState("");
  const [vmColor, setVmColor] = useState("#6366f1");
  const [addingVm, setAddingVm] = useState(false);
  const [vmLoaded, setVmLoaded] = useState(false);

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
    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to add member");
      setInviting(false);
      return;
    }
    setMembers((prev) => [...prev, data]);
    setInviteEmail("");
    setInviting(false);
    toast.success("Member added!");
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member?")) return;
    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to remove member");
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    toast.success("Member removed");
  }

  async function loadVirtualMembers() {
    if (vmLoaded) return;
    const { data } = await supabase.from("virtual_members").select("*").eq("project_id", project.id).order("created_at");
    setVirtualMembers(data || []);
    setVmLoaded(true);
  }

  async function addVirtualMember(e: React.FormEvent) {
    e.preventDefault();
    if (!vmName.trim()) return;
    setAddingVm(true);
    const { data, error } = await supabase
      .from("virtual_members")
      .insert({ project_id: project.id, name: vmName.trim(), color: vmColor, created_by: userId })
      .select()
      .single();
    if (error) { toast.error(error.message); setAddingVm(false); return; }
    setVirtualMembers((prev) => [...prev, data]);
    setVmName("");
    setVmColor("#6366f1");
    setAddingVm(false);
    toast.success("Virtual member added");
  }

  async function removeVirtualMember(id: string) {
    if (!confirm("Remove this virtual member? Issues assigned to them will become unassigned.")) return;
    const { error } = await supabase.from("virtual_members").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setVirtualMembers((prev) => prev.filter((m) => m.id !== id));
    toast.success("Virtual member removed");
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

      {/* Virtual Members */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Virtual Members</h2>
            <p className="text-xs text-gray-400 mt-0.5">Dummy team members for personal tracking — no real accounts needed.</p>
          </div>
          {!vmLoaded && (
            <Button size="sm" variant="outline" onClick={loadVirtualMembers} className="gap-1.5 text-xs">
              <Users size={13} /> Load virtual members
            </Button>
          )}
        </div>
        {vmLoaded && (
          <>
            <form onSubmit={addVirtualMember} className="flex gap-2 mb-4 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <Input value={vmName} onChange={(e) => setVmName(e.target.value)} placeholder="e.g. Alice (Design)" className="h-8 text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                <input
                  type="color"
                  value={vmColor}
                  onChange={(e) => setVmColor(e.target.value)}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0.5"
                />
              </div>
              <Button type="submit" disabled={addingVm} size="sm" className="gap-1.5 h-8">
                <UserPlus size={13} />
                {addingVm ? "Adding..." : "Add"}
              </Button>
            </form>
            <div className="space-y-2">
              {virtualMembers.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No virtual members yet.</p>
              )}
              {virtualMembers.map((vm) => (
                <div key={vm.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: vm.color }}
                    >
                      {vm.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{vm.name}</div>
                      <div className="text-xs text-gray-400">Virtual · no account</div>
                    </div>
                  </div>
                  <button onClick={() => removeVirtualMember(vm.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
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

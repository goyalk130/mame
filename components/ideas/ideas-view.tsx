"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Idea, Project, Sprint } from "@/types";
import { Lightbulb, Plus, ArrowRightCircle, Trash2, CheckSquare, Square, AlertTriangle, X, Pencil, Lock } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { RichEditor } from "@/components/ui/rich-editor";

interface IdeasViewProps {
  project: Project;
  initialIdeas: Idea[];
  activeSprint: Sprint | null;
  userId: string;
}

type Filter = "all" | "open" | "converted";

export function IdeasView({ project, initialIdeas, activeSprint, userId }: IdeasViewProps) {
  const supabase = createClient();

  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [filter, setFilter] = useState<Filter>("open");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // New idea form — persisted to localStorage so drafts survive crashes
  const DRAFT_KEY = `mame_idea_draft_${project.id}`;
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Check for saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const { title, desc } = JSON.parse(saved);
        if (title || desc) setHasDraft(true);
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist draft on every change
  useEffect(() => {
    if (!createOpen) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title: newTitle, desc: newDesc }));
    } catch {}
  }, [newTitle, newDesc, createOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    // Restore draft if one exists
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const { title, desc } = JSON.parse(saved);
        setNewTitle(title || "");
        setNewDesc(desc || "");
      } else {
        setNewTitle("");
        setNewDesc("");
      }
    } catch {
      setNewTitle("");
      setNewDesc("");
    }
    setCreateOpen(true);
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setHasDraft(false);
  }

  // Convert confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [convertingIds, setConvertingIds] = useState<string[]>([]);
  const [converting, setConverting] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Full-screen idea viewer / editor
  const [viewingIdea, setViewingIdea] = useState<Idea | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  function openIdea(idea: Idea) {
    setViewingIdea(idea);
    setEditMode(false);
    setEditTitle(idea.title);
    setEditDesc(idea.description || "");
  }

  function closeIdea() {
    setViewingIdea(null);
    setEditMode(false);
  }

  function enterEdit() {
    if (!viewingIdea) return;
    setEditTitle(viewingIdea.title);
    setEditDesc(viewingIdea.description || "");
    setEditMode(true);
  }

  async function handleSaveEdit() {
    if (!viewingIdea || !editTitle.trim()) return;
    setEditSaving(true);
    const { error } = await (supabase as any)
      .from("ideas")
      .update({ title: editTitle.trim(), description: editDesc.trim() || null })
      .eq("id", viewingIdea.id);
    if (error) { toast.error(error.message); setEditSaving(false); return; }
    const updated = { ...viewingIdea, title: editTitle.trim(), description: editDesc.trim() || null };
    setIdeas((prev) => prev.map((i) => i.id === viewingIdea.id ? updated : i));
    setViewingIdea(updated);
    setEditMode(false);
    setEditSaving(false);
    toast.success("Idea updated");
  }

  const filtered = useMemo(() => {
    if (filter === "open") return ideas.filter((i) => !i.converted);
    if (filter === "converted") return ideas.filter((i) => i.converted);
    return ideas;
  }, [ideas, filter]);

  const openCount = ideas.filter((i) => !i.converted).length;
  const convertedCount = ideas.filter((i) => i.converted).length;

  // ── Create idea ───────────────────────────────────────────────────────────
  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    const { data, error } = await (supabase as any)
      .from("ideas")
      .insert({
        project_id: project.id,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        created_by: userId,
      })
      .select("*, creator:profiles!created_by(*)")
      .single();
    if (error) { toast.error(error.message); setSaving(false); return; }
    setIdeas((prev) => [data as Idea, ...prev]);
    setNewTitle("");
    setNewDesc("");
    clearDraft();
    setCreateOpen(false);
    setSaving(false);
    toast.success("Idea added!");
  }

  // ── Open convert confirm ──────────────────────────────────────────────────
  function openConvert(ids: string[]) {
    setConvertingIds(ids);
    setConfirmOpen(true);
  }

  // ── Convert ideas → triage issues ────────────────────────────────────────
  async function handleConvert() {
    setConverting(true);
    const toConvert = ideas.filter((i) => convertingIds.includes(i.id));

    const results: { ideaId: string; issueId: string }[] = [];
    for (const idea of toConvert) {
      // Generate next issue key
      const { data: keyNum } = await (supabase as any).rpc("get_next_issue_key", { p_project_id: project.id });
      const issueKey = `${project.key}-${keyNum}`;

      const { data: issue, error } = await (supabase as any)
        .from("issues")
        .insert({
          key: issueKey,
          title: idea.title,
          description: idea.description,
          type: "task",
          status: "triage",
          priority: "medium",
          project_id: project.id,
          sprint_id: activeSprint?.id ?? null,
          reporter_id: userId,
          sort_order: Date.now(),
        })
        .select("id")
        .single();

      if (error) { toast.error(`Failed to convert "${idea.title}": ${error.message}`); continue; }
      results.push({ ideaId: idea.id, issueId: (issue as any).id });
    }

    // Mark ideas as converted
    await Promise.all(
      results.map(({ ideaId, issueId }) =>
        (supabase as any)
          .from("ideas")
          .update({ converted: true, converted_at: new Date().toISOString(), converted_issue_id: issueId })
          .eq("id", ideaId)
      )
    );

    setIdeas((prev) =>
      prev.map((i) => {
        const r = results.find((r) => r.ideaId === i.id);
        return r ? { ...i, converted: true, converted_at: new Date().toISOString(), converted_issue_id: r.issueId } : i;
      })
    );

    setSelected(new Set());
    setConvertingIds([]);
    setConfirmOpen(false);
    setConverting(false);
    toast.success(
      results.length === 1
        ? "Idea converted to triage issue!"
        : `${results.length} ideas converted to triage issues!`
    );
  }

  // ── Delete idea ───────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await (supabase as any).from("ideas").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); setDeleting(false); return; }
    setIdeas((prev) => prev.filter((i) => i.id !== deleteId));
    setSelected((prev) => { const s = new Set(prev); s.delete(deleteId); return s; });
    if (viewingIdea?.id === deleteId) closeIdea();
    setDeleteId(null);
    setDeleting(false);
    toast.success("Idea deleted");
  }

  // ── Select helpers ────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function toggleSelectAll() {
    const openIds = filtered.filter((i) => !i.converted).map((i) => i.id);
    if (openIds.every((id) => selected.has(id)) && openIds.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(openIds));
    }
  }

  const selectedOpen = [...selected].filter((id) => {
    const idea = ideas.find((i) => i.id === id);
    return idea && !idea.converted;
  });

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Lightbulb size={20} className="text-yellow-500" />
          <h1 className="text-lg font-semibold text-gray-900">Ideas</h1>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{openCount} open</span>
        </div>
        <div className="flex items-center gap-2">
          {selectedOpen.length > 0 && (
            <button
              onClick={() => openConvert(selectedOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <ArrowRightCircle size={15} />
              Convert {selectedOpen.length} to Triage
            </button>
          )}
          <button
            onClick={openCreate}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <Plus size={15} />
            New Idea
            {hasDraft && (
              <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" title="Unsaved draft restored" />
            )}
          </button>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-gray-100 bg-white">
        {(["all", "open", "converted"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors",
              filter === f ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            )}
          >
            {f} {f === "open" ? `(${openCount})` : f === "converted" ? `(${convertedCount})` : `(${ideas.length})`}
          </button>
        ))}
        {filtered.filter((i) => !i.converted).length > 0 && filter !== "converted" && (
          <button
            onClick={toggleSelectAll}
            className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {filtered.filter((i) => !i.converted).every((i) => selected.has(i.id))
              ? <CheckSquare size={13} />
              : <Square size={13} />}
            Select all
          </button>
        )}
      </div>

      {/* ── Ideas list ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Lightbulb size={40} className="mb-3 text-gray-300" />
            <p className="text-sm font-medium">
              {filter === "converted" ? "No converted ideas yet" : "No ideas yet — add the first one!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                selected={selected.has(idea.id)}
                onToggle={() => toggleSelect(idea.id)}
                onConvert={() => openConvert([idea.id])}
                onDelete={() => setDeleteId(idea.id)}
                onOpen={() => openIdea(idea)}
                userId={userId}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Create Idea — Full Screen ── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Full-screen header */}
          <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <Lightbulb size={20} className="text-yellow-500" />
              <span className="font-semibold text-gray-900">New Idea</span>
              {hasDraft && (
                <span className="flex items-center gap-1.5 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
                  Draft restored
                  <button
                    type="button"
                    onClick={() => { clearDraft(); setNewTitle(""); setNewDesc(""); }}
                    className="ml-1 text-yellow-600 hover:text-red-500 font-medium"
                  >
                    Discard
                  </button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => handleCreate(e as any)}
                disabled={!newTitle.trim() || saving}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Add Idea"}
              </button>
            </div>
          </div>

          {/* Full-screen body */}
          <div className="flex-1 overflow-y-auto px-8 py-8 max-w-4xl mx-auto w-full">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              placeholder="Idea title…"
              className="w-full text-3xl font-bold text-gray-900 placeholder-gray-300 border-none outline-none bg-transparent mb-6"
            />
            <RichEditor
              key={createOpen ? "open" : "closed"}
              content={newDesc}
              onChange={setNewDesc}
              placeholder="Describe your idea in detail — add context, links, images, lists…"
              borderless
            />
          </div>
        </div>
      )}

      {/* ── Convert Confirm Modal ── */}
      {confirmOpen && (
        <Modal onClose={() => !converting && setConfirmOpen(false)}>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <ArrowRightCircle size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Convert to Triage</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {convertingIds.length === 1
                  ? "This idea will become a task in Triage status."
                  : `${convertingIds.length} ideas will become tasks in Triage status.`}
              </p>
            </div>
          </div>

          {/* Sprint info */}
          <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4 text-sm">
            <span className="text-gray-500">Added to sprint: </span>
            <span className="font-medium text-gray-800">
              {activeSprint ? activeSprint.name : "Backlog (no active sprint)"}
            </span>
          </div>

          {/* Ideas to convert */}
          <div className="space-y-1.5 mb-5 max-h-40 overflow-y-auto">
            {ideas
              .filter((i) => convertingIds.includes(i.id))
              .map((idea) => (
                <div key={idea.id} className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-100 rounded-lg">
                  <Lightbulb size={13} className="text-yellow-500 shrink-0" />
                  <span className="text-sm text-gray-800 truncate">{idea.title}</span>
                </div>
              ))}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={converting}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConvert}
              disabled={converting}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {converting ? "Converting…" : "Confirm Convert"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Full-screen Idea Viewer / Editor ── */}
      {viewingIdea && (() => {
        const isOwner = viewingIdea.created_by === userId;
        const creatorName = (viewingIdea.creator as any)?.full_name || (viewingIdea.creator as any)?.email || "Unknown";
        const timeAgo = formatDistanceToNow(new Date(viewingIdea.created_at), { addSuffix: true });
        return (
          <div className="fixed inset-0 z-50 bg-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <Lightbulb size={20} className="text-yellow-500" />
                <span className="font-semibold text-gray-900">{editMode ? "Editing Idea" : "Idea"}</span>
                {viewingIdea.converted && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Converted
                  </span>
                )}
                {!isOwner && (
                  <span className="flex items-center gap-1 text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    <Lock size={10} />
                    Read only
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isOwner && !editMode && (
                  <>
                    <button
                      onClick={enterEdit}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                    {!viewingIdea.converted && (
                      <button
                        onClick={() => { closeIdea(); setDeleteId(viewingIdea.id); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete idea"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </>
                )}
                {editMode && (
                  <>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-4 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editTitle.trim() || editSaving}
                      className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {editSaving ? "Saving…" : "Save"}
                    </button>
                  </>
                )}
                <button
                  onClick={closeIdea}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-8 py-8 max-w-4xl mx-auto w-full">
              {/* Title */}
              {editMode ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                  className="w-full text-3xl font-bold text-gray-900 placeholder-gray-300 border-none outline-none bg-transparent mb-6"
                />
              ) : (
                <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-snug">{viewingIdea.title}</h1>
              )}

              {/* Meta */}
              <div className="flex items-center gap-2 mb-6 pb-6 border-b border-gray-100">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {getInitials(creatorName)}
                </div>
                <span className="text-sm text-gray-600 font-medium">{creatorName}</span>
                <span className="text-gray-300">·</span>
                <span className="text-sm text-gray-400">{timeAgo}</span>
              </div>

              {/* Description */}
              {editMode ? (
                <RichEditor
                  key="edit-mode"
                  content={editDesc}
                  onChange={setEditDesc}
                  placeholder="Describe your idea in detail…"
                  borderless
                />
              ) : viewingIdea.description?.trim() ? (
                <div
                  className="prose prose-sm max-w-none text-gray-700 [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2"
                  dangerouslySetInnerHTML={{ __html: viewingIdea.description }}
                />
              ) : (
                <p className="text-gray-400 italic text-sm">No description added.</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Delete Confirm Modal ── */}
      {deleteId && (
        <Modal onClose={() => !deleting && setDeleteId(null)}>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Delete Idea</h2>
              <p className="text-sm text-gray-500 mt-0.5">This action cannot be undone.</p>
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-5 bg-gray-50 rounded-lg px-4 py-3 truncate">
            "{ideas.find((i) => i.id === deleteId)?.title}"
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteId(null)} disabled={deleting} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50">
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Idea Card ────────────────────────────────────────────────────────────────
function IdeaCard({
  idea,
  selected,
  onToggle,
  onConvert,
  onDelete,
  onOpen,
  userId,
}: {
  idea: Idea;
  selected: boolean;
  onToggle: () => void;
  onConvert: () => void;
  onDelete: () => void;
  onOpen: () => void;
  userId: string;
}) {
  const hasDesc = !!idea.description?.trim();
  const creatorName = (idea.creator as any)?.full_name || (idea.creator as any)?.email || "Unknown";
  const initials = getInitials(creatorName);
  const timeAgo = formatDistanceToNow(new Date(idea.created_at), { addSuffix: true });
  const isOwner = idea.created_by === userId;

  return (
    <div
      className={cn(
        "bg-white border rounded-xl p-4 transition-all",
        selected ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300",
        idea.converted && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox — only for open ideas */}
        {!idea.converted ? (
          <button onClick={onToggle} className="mt-0.5 shrink-0 text-gray-400 hover:text-blue-500 transition-colors">
            {selected ? <CheckSquare size={16} className="text-blue-500" /> : <Square size={16} />}
          </button>
        ) : (
          <div className="mt-0.5 shrink-0 w-4 h-4" />
        )}

        {/* Bulb icon */}
        <Lightbulb size={16} className={cn("mt-0.5 shrink-0", idea.converted ? "text-gray-400" : "text-yellow-500")} />

        {/* Content — clicking title/desc area opens full screen */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <button
              onClick={onOpen}
              className="text-sm font-medium text-gray-900 leading-snug text-left hover:text-blue-600 transition-colors"
            >
              {idea.title}
            </button>
            {idea.converted ? (
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Converted
              </span>
            ) : (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={onConvert}
                  title="Convert to triage issue"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <ArrowRightCircle size={12} />
                  Convert
                </button>
                {isOwner && (
                  <button
                    onClick={onDelete}
                    title="Delete idea"
                    className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Description preview — click to open full screen */}
          {hasDesc && (
            <button
              onClick={onOpen}
              className="mt-1 w-full text-left"
            >
              <div className="max-h-12 overflow-hidden">
                <div
                  className="prose prose-xs max-w-none text-gray-500 [&_*]:text-xs [&_p]:my-0 [&_ul]:my-0 [&_ol]:my-0 pointer-events-none"
                  dangerouslySetInnerHTML={{ __html: idea.description! }}
                />
              </div>
              {idea.description && idea.description.replace(/<[^>]*>/g, "").length > 120 && (
                <span className="text-[11px] text-blue-500 mt-0.5 inline-block">Read more…</span>
              )}
            </button>
          )}

          {/* Meta */}
          <div className="flex items-center gap-2 mt-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
              {initials}
            </div>
            <span className="text-[11px] text-gray-500">{creatorName}</span>
            <span className="text-gray-300">·</span>
            <span className="text-[11px] text-gray-400">{timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Generic Modal ────────────────────────────────────────────────────────────
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

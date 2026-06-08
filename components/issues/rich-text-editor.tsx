"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading2, Heading3, Quote,
  Link as LinkIcon, Highlighter, Palette, AlignLeft, AlignCenter, AlignRight,
  Undo, Redo,
} from "lucide-react";
import { useEffect } from "react";

const TEXT_COLORS = [
  { label: "Default", color: "" },
  { label: "Red", color: "#ef4444" },
  { label: "Orange", color: "#f97316" },
  { label: "Yellow", color: "#eab308" },
  { label: "Green", color: "#22c55e" },
  { label: "Blue", color: "#3b82f6" },
  { label: "Purple", color: "#a855f7" },
  { label: "Gray", color: "#6b7280" },
];

const HIGHLIGHT_COLORS = [
  { label: "Yellow", color: "#fef08a" },
  { label: "Green", color: "#bbf7d0" },
  { label: "Blue", color: "#bfdbfe" },
  { label: "Pink", color: "#fbcfe8" },
  { label: "Orange", color: "#fed7aa" },
  { label: "Purple", color: "#e9d5ff" },
];

interface Props {
  content: string;
  onSave: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onSave, placeholder = "Add description…" }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, forceUpdate] = useState(0);
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const colorRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-blue-500 underline" } }),
      Image.configure({ HTMLAttributes: { class: "max-w-full rounded-lg my-2" } }),
    ],
    content,
    editable: editing,
    onTransaction: () => forceUpdate(n => n + 1),
    onSelectionUpdate: () => forceUpdate(n => n + 1),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-3 py-2 min-h-[120px] text-gray-800",
      },
    },
  });

  // Sync content when switching issues
  useEffect(() => {
    if (editor) editor.commands.setContent(content || "");
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle editable on the existing editor instance (no remount)
  useEffect(() => {
    if (editor) editor.setEditable(editing);
    if (editor && editing) setTimeout(() => editor.commands.focus("end"), 50);
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdowns on outside mousedown
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setColorOpen(false);
      if (highlightRef.current && !highlightRef.current.contains(e.target as Node)) setHighlightOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSave() {
    setSaving(true);
    await onSave(editor?.getHTML() ?? "");
    setSaving(false);
    setEditing(false);
  }

  function handleCancel() {
    editor?.commands.setContent(content || "");
    setEditing(false);
  }

  function applyLink() {
    if (linkUrl) editor?.chain().focus().setLink({ href: linkUrl }).run();
    else editor?.chain().focus().unsetLink().run();
    setLinkUrl("");
    setLinkOpen(false);
  }

  if (!editor) return null;

  const TB = ({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn("w-6 h-6 flex items-center justify-center rounded text-gray-600 transition-colors",
        active ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100")}
    >
      {children}
    </button>
  );

  return (
    <div
      className={cn(
        "rounded-lg border transition-all",
        editing ? "border-blue-400 bg-white shadow-sm" : "border-transparent hover:border-gray-200 cursor-pointer hover:bg-gray-50"
      )}
      onClick={() => !editing && setEditing(true)}
    >
      {/* Toolbar — only when editing */}
      {editing && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-gray-100 bg-gray-50 rounded-t-lg">
          <TB onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo size={12} /></TB>
          <TB onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo size={12} /></TB>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <TB onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold size={12} /></TB>
          <TB onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic size={12} /></TB>
          <TB onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><UnderlineIcon size={12} /></TB>
          <TB onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strike"><Strikethrough size={12} /></TB>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <TB onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2"><Heading2 size={12} /></TB>
          <TB onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3"><Heading3 size={12} /></TB>
          <TB onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list"><List size={12} /></TB>
          <TB onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list"><ListOrdered size={12} /></TB>
          <TB onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote"><Quote size={12} /></TB>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <TB onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Left"><AlignLeft size={12} /></TB>
          <TB onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Center"><AlignCenter size={12} /></TB>
          <TB onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Right"><AlignRight size={12} /></TB>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* Color */}
          <div ref={colorRef} className="relative">
            <button type="button" title="Text color"
              onMouseDown={(e) => { e.preventDefault(); setColorOpen(v => !v); setHighlightOpen(false); }}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:bg-gray-100"
            ><Palette size={12} /></button>
            {colorOpen && (
              <div className="absolute top-7 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 w-36">
                {TEXT_COLORS.map(({ label, color }) => (
                  <button key={label} type="button" title={label}
                    onMouseDown={(e) => { e.preventDefault(); color ? editor.chain().focus().setColor(color).run() : editor.chain().focus().unsetColor().run(); setColorOpen(false); }}
                    className="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                    style={{ background: color || "#111827" }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Highlight */}
          <div ref={highlightRef} className="relative">
            <button type="button" title="Highlight"
              onMouseDown={(e) => { e.preventDefault(); setHighlightOpen(v => !v); setColorOpen(false); }}
              className={cn("w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:bg-gray-100", editor.isActive("highlight") && "bg-blue-100 text-blue-700")}
            ><Highlighter size={12} /></button>
            {highlightOpen && (
              <div className="absolute top-7 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 w-32">
                {HIGHLIGHT_COLORS.map(({ label, color }) => (
                  <button key={label} type="button" title={label}
                    onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHighlight({ color }).run(); setHighlightOpen(false); }}
                    className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ background: color }}
                  />
                ))}
                <button type="button"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); setHighlightOpen(false); }}
                  className="text-[10px] text-gray-400 hover:text-red-500 w-full text-left mt-1"
                >Remove</button>
              </div>
            )}
          </div>

          {/* Link */}
          <div className="relative">
            <TB onClick={() => setLinkOpen(v => !v)} active={editor.isActive("link")} title="Link"><LinkIcon size={12} /></TB>
            {linkOpen && (
              <div className="absolute top-7 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-2 w-60">
                <input autoFocus value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && applyLink()}
                  placeholder="https://…"
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button type="button" onMouseDown={(e) => { e.preventDefault(); applyLink(); }}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs">OK</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor body */}
      <EditorContent editor={editor} />

      {/* Save / Cancel */}
      {editing && (
        <div className="flex gap-2 px-3 pb-3 pt-1">
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
        </div>
      )}

      {/* Placeholder when not editing and empty */}
      {!editing && !content && (
        <p className="text-sm text-gray-400 px-3 py-2">{placeholder}</p>
      )}
    </div>
  );
}

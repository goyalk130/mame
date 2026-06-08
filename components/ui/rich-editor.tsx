"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Link as LinkIcon, Image as ImageIcon,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Highlighter, Type, Palette, Heading1, Heading2, Heading3,
  Quote, Undo, Redo, Minus,
} from "lucide-react";

const TEXT_COLORS = [
  { label: "Default", color: "" },
  { label: "Red", color: "#ef4444" },
  { label: "Orange", color: "#f97316" },
  { label: "Yellow", color: "#eab308" },
  { label: "Green", color: "#22c55e" },
  { label: "Blue", color: "#3b82f6" },
  { label: "Purple", color: "#a855f7" },
  { label: "Pink", color: "#ec4899" },
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

interface RichEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  minHeight?: string;
  borderless?: boolean;
}

export function RichEditor({
  content = "",
  onChange,
  placeholder = "Write something…",
  editable = true,
  className,
  minHeight = "150px",
  borderless = false,
}: RichEditorProps) {
  const [, forceUpdate] = useState(0);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [highlightMenuOpen, setHighlightMenuOpen] = useState(false);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageMenuOpen, setImageMenuOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
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
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-blue-500 underline cursor-pointer" } }),
      Image.configure({ HTMLAttributes: { class: "max-w-full rounded-lg my-2" } }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    onTransaction: () => forceUpdate(n => n + 1),
    onSelectionUpdate: () => forceUpdate(n => n + 1),
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none",
          borderless ? "px-0 py-2" : "px-4 py-3"
        ),
        style: borderless ? "" : `min-height: ${minHeight}`,
      },
    },
  });

  // Sync content from outside (e.g. when switching issues)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setColorMenuOpen(false);
      if (highlightRef.current && !highlightRef.current.contains(e.target as Node)) setHighlightMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!editor) return null;

  function applyLink() {
    if (linkUrl) {
      editor?.chain().focus().setLink({ href: linkUrl }).run();
    } else {
      editor?.chain().focus().unsetLink().run();
    }
    setLinkUrl("");
    setLinkMenuOpen(false);
  }

  function applyImage() {
    if (imageUrl) editor?.chain().focus().setImage({ src: imageUrl }).run();
    setImageUrl("");
    setImageMenuOpen(false);
  }

  const ToolBtn = ({
    onClick, active, title, children,
  }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        "w-7 h-7 flex items-center justify-center rounded transition-colors text-gray-600",
        active ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
      )}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-5 bg-gray-200 mx-0.5" />;

  if (!editable) {
    return (
      <div className={cn("prose prose-sm max-w-none px-1", className)}>
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className={cn(
      borderless
        ? "bg-transparent"
        : "border border-gray-300 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all",
      className
    )}>
      {/* Toolbar */}
      <div className={cn(
        "flex flex-wrap items-center gap-0.5 px-2 py-1.5",
        borderless
          ? "mb-2 border border-gray-200 rounded-xl bg-white shadow-sm sticky top-0 z-10"
          : "border-b border-gray-200 bg-gray-50"
      )}>
        {/* Undo / Redo */}
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo size={13} /></ToolBtn>
        <Divider />

        {/* Headings */}
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1"><Heading1 size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2"><Heading2 size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3"><Heading3 size={13} /></ToolBtn>
        <Divider />

        {/* Inline formatting */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><UnderlineIcon size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough"><Strikethrough size={13} /></ToolBtn>
        <Divider />

        {/* Text color */}
        <div ref={colorRef} className="relative">
          <button
            type="button"
            title="Text color"
            onMouseDown={(e) => { e.preventDefault(); setColorMenuOpen((v) => !v); setHighlightMenuOpen(false); }}
            className="w-7 h-7 flex items-center justify-center rounded transition-colors text-gray-600 hover:bg-gray-100"
          >
            <Palette size={13} />
          </button>
          {colorMenuOpen && (
            <div className="absolute top-8 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 w-40">
              {TEXT_COLORS.map(({ label, color }) => (
                <button
                  key={label}
                  type="button"
                  title={label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    color ? editor.chain().focus().setColor(color).run() : editor.chain().focus().unsetColor().run();
                    setColorMenuOpen(false);
                  }}
                  className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                  style={{ background: color || "#111827" }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Highlight */}
        <div ref={highlightRef} className="relative">
          <button
            type="button"
            title="Highlight"
            onMouseDown={(e) => { e.preventDefault(); setHighlightMenuOpen((v) => !v); setColorMenuOpen(false); }}
            className={cn("w-7 h-7 flex items-center justify-center rounded transition-colors text-gray-600 hover:bg-gray-100", editor.isActive("highlight") && "bg-blue-100 text-blue-700")}
          >
            <Highlighter size={13} />
          </button>
          {highlightMenuOpen && (
            <div className="absolute top-8 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 w-36">
              {HIGHLIGHT_COLORS.map(({ label, color }) => (
                <button
                  key={label}
                  type="button"
                  title={label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().toggleHighlight({ color }).run();
                    setHighlightMenuOpen(false);
                  }}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{ background: color }}
                />
              ))}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); setHighlightMenuOpen(false); }}
                className="text-[10px] text-gray-500 hover:text-red-500 w-full text-left mt-1"
              >
                Remove
              </button>
            </div>
          )}
        </div>
        <Divider />

        {/* Lists */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list"><List size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list"><ListOrdered size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote"><Quote size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus size={13} /></ToolBtn>
        <Divider />

        {/* Alignment */}
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left"><AlignLeft size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center"><AlignCenter size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right"><AlignRight size={13} /></ToolBtn>
        <Divider />

        {/* Link */}
        <div className="relative">
          <ToolBtn onClick={() => { setLinkMenuOpen((v) => !v); setImageMenuOpen(false); }} active={editor.isActive("link")} title="Link">
            <LinkIcon size={13} />
          </ToolBtn>
          {linkMenuOpen && (
            <div className="absolute top-8 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 flex gap-2 w-72">
              <input
                autoFocus
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyLink()}
                placeholder="https://..."
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button type="button" onMouseDown={(e) => { e.preventDefault(); applyLink(); }} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">OK</button>
            </div>
          )}
        </div>

        {/* Image */}
        <div className="relative">
          <ToolBtn onClick={() => { setImageMenuOpen((v) => !v); setLinkMenuOpen(false); }} title="Image">
            <ImageIcon size={13} />
          </ToolBtn>
          {imageMenuOpen && (
            <div className="absolute top-8 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 flex gap-2 w-72">
              <input
                autoFocus
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyImage()}
                placeholder="Image URL…"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button type="button" onMouseDown={(e) => { e.preventDefault(); applyImage(); }} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Insert</button>
            </div>
          )}
        </div>
      </div>

      {/* Editor content area */}
      <EditorContent editor={editor} />
    </div>
  );
}

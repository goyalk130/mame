"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, Code, Heading2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  content: string;
  onSave: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onSave, placeholder = "Add description..." }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable: editing,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[80px] text-gray-700",
      },
    },
  });

  useEffect(() => {
    if (editor && !editing) {
      editor.setEditable(false);
    } else if (editor && editing) {
      editor.setEditable(true);
      editor.commands.focus("end");
    }
  }, [editing, editor]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
  }, [content]);

  async function handleSave() {
    if (!editor) return;
    setSaving(true);
    await onSave(editor.getHTML());
    setSaving(false);
    setEditing(false);
  }

  function handleCancel() {
    editor?.commands.setContent(content || "");
    setEditing(false);
  }

  if (!editor) return null;

  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        editing ? "border-blue-400 bg-white" : "border-transparent hover:border-gray-200 cursor-pointer"
      )}
      onClick={() => !editing && setEditing(true)}
    >
      {editing && (
        <div className="flex items-center gap-1 px-2 pt-2 border-b border-gray-100">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
            <Bold size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
            <Italic size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading">
            <Heading2 size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
            <List size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
            <ListOrdered size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code block">
            <Code size={13} />
          </ToolbarButton>
        </div>
      )}
      <div className="px-3 py-2">
        <EditorContent editor={editor} />
      </div>
      {editing && (
        <div className="flex gap-2 px-3 pb-3">
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
        </div>
      )}
      {!editing && !content && (
        <div className="px-3 py-2 text-sm text-gray-400">{placeholder}</div>
      )}
    </div>
  );
}

function ToolbarButton({ onClick, active, title, children }: { onClick: () => void; active: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded transition-colors",
        active ? "bg-gray-200 text-gray-900" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      {children}
    </button>
  );
}

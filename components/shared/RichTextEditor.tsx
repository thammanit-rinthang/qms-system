"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Minus,
  Undo2,
  Redo2,
} from "lucide-react";

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
  error?: boolean;
  disabled?: boolean;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded p-1 transition-colors",
        active
          ? "bg-[#0F1059] text-white"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
        disabled && "cursor-not-allowed opacity-30"
      )}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "พิมพ์ข้อความ...",
  minHeight = 120,
  className,
  error,
  disabled,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
      }),
      Placeholder.configure({
        placeholder,
        emptyNodeClass: "tiptap-placeholder",
      }),
    ],
    content: value ?? "",
    editable: !disabled,
    onUpdate({ editor }) {
      // Return HTML so spacing/line-breaks are preserved exactly as typed
      onChange?.(editor.getHTML());
    },
  });

  // Sync external value changes (e.g., form reset)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    // Avoid cursor jump if content is same
    if (value !== undefined && value !== current) {
      editor.commands.setContent(value ?? "");
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "rounded-xl border bg-white transition-colors",
        error
          ? "border-rose-400 focus-within:ring-1 focus-within:ring-rose-400"
          : "border-slate-200 focus-within:border-[#0F1059] focus-within:ring-1 focus-within:ring-[#0F1059]",
        disabled && "cursor-not-allowed bg-slate-50 opacity-70",
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-slate-100 px-2 py-1.5">
        <ToolbarButton
          title="ตัวหนา (Ctrl+B)"
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="ตัวเอียง (Ctrl+I)"
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-slate-200" />

        <ToolbarButton
          title="รายการไม่มีลำดับ"
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="รายการมีลำดับ"
          active={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-slate-200" />

        <ToolbarButton
          title="เส้นแบ่ง"
          disabled={disabled}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-3.5 w-3.5" />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-slate-200" />

        <ToolbarButton
          title="ย้อนกลับ (Ctrl+Z)"
          disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="ทำซ้ำ (Ctrl+Y)"
          disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="rich-editor-content px-3 py-2.5 text-sm text-slate-800 focus:outline-none"
        style={{ minHeight }}
      />

      <style>{`
        .rich-editor-content .ProseMirror {
          outline: none;
          min-height: ${minHeight}px;
        }
        .rich-editor-content .ProseMirror p {
          margin: 0 0 0.4em;
          line-height: 1.6;
        }
        .rich-editor-content .ProseMirror p:last-child {
          margin-bottom: 0;
        }
        .rich-editor-content .ProseMirror ul,
        .rich-editor-content .ProseMirror ol {
          padding-left: 1.4em;
          margin: 0.3em 0;
        }
        .rich-editor-content .ProseMirror li {
          margin: 0.15em 0;
        }
        .rich-editor-content .ProseMirror strong {
          font-weight: 700;
        }
        .rich-editor-content .ProseMirror em {
          font-style: italic;
        }
        .rich-editor-content .ProseMirror hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 0.6em 0;
        }
        .rich-editor-content .tiptap-placeholder::before {
          content: attr(data-placeholder);
          float: left;
          color: #94a3b8;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}

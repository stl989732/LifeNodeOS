"use client";

import type { Editor, JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { type ReactNode, useEffect, useRef } from "react";
import { getProVaultExtensions } from "@/src/components/pro/vault/vaultEditorExtensions";

const PANEL = "rounded-xl border border-slate-200 bg-white";
const TOOL_BTN =
  "rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40";
const COLOR_SWATCH = "h-6 w-6 cursor-pointer rounded border border-slate-200";

function ToolbarBtn({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${TOOL_BTN} ${active ? "border-slate-800 bg-slate-800 text-white hover:bg-slate-800" : ""}`}
    >
      {children}
    </button>
  );
}

type Props = {
  docKey: string;
  initialDoc: JSONContent;
  onChange: (json: JSONContent) => void;
  editorRef: React.MutableRefObject<Editor | null>;
};

export default function ProTiptapSurface({
  docKey,
  initialDoc,
  onChange,
  editorRef,
}: Props) {
  const loadedDocKey = useRef<string | null>(null);
  const editor = useEditor({
    extensions: getProVaultExtensions(),
    content: initialDoc,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id: "pro-vault-editor-root",
        class:
          "pro-vault-editor min-h-[min(70vh,560px)] px-4 py-3 text-sm text-slate-800 outline-none focus:outline-none [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
      },
    },
    onCreate: ({ editor: ed }) => {
      editorRef.current = ed;
    },
    onDestroy: () => {
      editorRef.current = null;
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (loadedDocKey.current === docKey) return;
    loadedDocKey.current = docKey;
    editor.commands.setContent(initialDoc, { emitUpdate: false });
  }, [docKey, editor, initialDoc]);

  if (!editor) {
    return (
      <div className={`${PANEL} min-h-[280px] animate-pulse bg-slate-50`}>
        <p className="p-4 text-xs text-slate-500">Loading editor…</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={`${PANEL} flex flex-wrap items-center gap-1.5 p-2`}
        data-pro-vault-toolbar
      >
        <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Type
        </span>
        <ToolbarBtn
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("paragraph") && !editor.isActive("heading")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          Body
        </ToolbarBtn>

        <span className="mx-1 h-4 w-px bg-slate-200" />

        <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Font
        </span>
        <select
          className="max-w-[140px] rounded-lg border border-slate-200 bg-white py-1 pl-2 pr-6 text-[11px] font-semibold text-slate-700"
          value={
            editor.getAttributes("textStyle").fontFamily?.includes("mono")
              ? "mono"
              : editor.getAttributes("textStyle").fontFamily?.includes("Georgia")
                ? "serif"
                : "sans"
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === "sans") editor.chain().focus().setFontFamily("ui-sans-serif, system-ui, sans-serif").run();
            else if (v === "serif") editor.chain().focus().setFontFamily("Georgia, ui-serif, serif").run();
            else editor.chain().focus().setFontFamily("ui-monospace, monospace").run();
          }}
        >
          <option value="sans">Sans</option>
          <option value="serif">Serif</option>
          <option value="mono">Mono</option>
        </select>

        <span className="mx-1 h-4 w-px bg-slate-200" />

        <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Size
        </span>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setFontSize("0.875rem").run()}
        >
          S
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setFontSize("1rem").run()}
        >
          N
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setFontSize("1.125rem").run()}
        >
          L
        </ToolbarBtn>

        <span className="mx-1 h-4 w-px bg-slate-200" />

        <ToolbarBtn
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          U
        </ToolbarBtn>

        <span className="mx-1 h-4 w-px bg-slate-200" />

        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Color
        </span>
        <input
          type="color"
          aria-label="Text color"
          className={COLOR_SWATCH}
          onInput={(e) =>
            editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()
          }
        />
        <input
          type="color"
          aria-label="Highlight"
          className={COLOR_SWATCH}
          onInput={(e) =>
            editor
              .chain()
              .focus()
              .toggleHighlight({ color: (e.target as HTMLInputElement).value })
              .run()
          }
        />
      </div>

      <div id="pro-vault-editor-canvas" className={`${PANEL} overflow-auto`}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

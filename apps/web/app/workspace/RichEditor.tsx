"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import type { DocumentRecord } from "./web-api";

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export type EditorSelection = {
  text: string;
  from: number;
  to: number;
};

export type RichEditorHandle = {
  applySuggestion: (
    text: string,
    mode: "replace_selection" | "insert_at_cursor" | "append",
  ) => Promise<DocumentRecord>;
};

const emptyEditorJson = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export const RichEditor = forwardRef<
  RichEditorHandle,
  {
    document: DocumentRecord;
    onSelectionChange: (selection: EditorSelection | null) => void;
    onSave: (payload: {
      editorJson: Record<string, unknown>;
      plainText: string;
    }) => Promise<DocumentRecord>;
  }
>(function RichEditor({ document, onSave, onSelectionChange }, ref) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string>("");
  const pendingSave = useRef<{
    editorJson: Record<string, unknown>;
    plainText: string;
  } | null>(null);
  const activeDocumentId = useRef(document.id);

  const initialContent = useMemo(
    () => document.editorJson ?? emptyEditorJson,
    [document.editorJson],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "seshat-editor-content",
      },
    },
    onUpdate({ editor: updatedEditor }) {
      pendingSave.current = {
        editorJson: updatedEditor.getJSON() as Record<string, unknown>,
        plainText: updatedEditor.getText(),
      };
      setSaveStatus("unsaved");
    },
    onSelectionUpdate({ editor: updatedEditor }) {
      const { from, to } = updatedEditor.state.selection;
      const text = updatedEditor.state.doc.textBetween(from, to, "\n").trim();
      onSelectionChange(text ? { text, from, to } : null);
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      async applySuggestion(text, mode) {
        if (!editor) {
          throw new Error("Editor is not ready.");
        }

        const { from, to } = editor.state.selection;
        if (mode === "replace_selection") {
          editor.chain().focus().insertContentAt({ from, to }, text).run();
        } else if (mode === "insert_at_cursor") {
          editor.chain().focus().insertContentAt(to, text).run();
        } else {
          editor
            .chain()
            .focus()
            .insertContentAt(editor.state.doc.content.size, `\n\n${text}`)
            .run();
        }

        const payload = {
          editorJson: editor.getJSON() as Record<string, unknown>,
          plainText: editor.getText(),
        };
        pendingSave.current = null;
        setSaveStatus("saving");
        const saved = await onSave(payload);
        setSaveStatus("saved");
        setLastSavedAt(new Date().toLocaleTimeString());
        return saved;
      },
    }),
    [editor, onSave],
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (activeDocumentId.current !== document.id) {
      activeDocumentId.current = document.id;
      pendingSave.current = null;
      editor.commands.setContent(document.editorJson ?? emptyEditorJson, { emitUpdate: false });
      onSelectionChange(null);
      setSaveStatus("saved");
      setLastSavedAt("");
    }
  }, [document, editor, onSelectionChange]);

  useEffect(() => {
    if (saveStatus !== "unsaved") {
      return;
    }

    const timeout = window.setTimeout(async () => {
      const payload = pendingSave.current;
      if (!payload) {
        return;
      }

      setSaveStatus("saving");
      try {
        await onSave(payload);
        pendingSave.current = null;
        setSaveStatus("saved");
        setLastSavedAt(new Date().toLocaleTimeString());
      } catch {
        setSaveStatus("error");
      }
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [onSave, saveStatus]);

  if (!editor) {
    return null;
  }

  return (
    <>
      <div className="toolbar">
        <button onClick={() => editor.chain().focus().setParagraph().run()}>Paragraph</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()}>Bullets</button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()}>Numbers</button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()}>Quote</button>
        <button onClick={() => editor.chain().focus().undo().run()}>Undo</button>
        <button onClick={() => editor.chain().focus().redo().run()}>Redo</button>
        <span className={saveStatus === "error" ? "error" : "muted"}>
          {saveStatus}
          {lastSavedAt ? ` at ${lastSavedAt}` : ""}
        </span>
      </div>
      <div className="editor-area">
        <div className="prose-editor">
          <EditorContent editor={editor} />
        </div>
      </div>
    </>
  );
});

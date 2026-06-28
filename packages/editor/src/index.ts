export type EditorJson = Record<string, unknown>;

export const emptyEditorJson: EditorJson = {
  type: "doc",
  content: [
    {
      type: "paragraph",
    },
  ],
};

export function countWords(plainText: string): number {
  const words = plainText.trim().match(/\S+/g);
  return words?.length ?? 0;
}

export function normalizePlainText(plainText: string): string {
  return plainText.replace(/\r\n/g, "\n").trim();
}

export function extractPlainText(editorJson: unknown): string {
  const parts: string[] = [];

  function visit(node: unknown): void {
    if (!node || typeof node !== "object") {
      return;
    }

    const record = node as Record<string, unknown>;
    if (typeof record.text === "string") {
      parts.push(record.text);
    }

    if (Array.isArray(record.content)) {
      for (const child of record.content) {
        visit(child);
      }
      const type = typeof record.type === "string" ? record.type : "";
      if (["paragraph", "heading", "blockquote", "listItem"].includes(type)) {
        parts.push("\n");
      }
    }
  }

  visit(editorJson);
  return normalizePlainText(parts.join(" ").replace(/\s*\n\s*/g, "\n"));
}

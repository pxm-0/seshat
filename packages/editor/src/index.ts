export type EditorJson = Record<string, unknown>;

export function countWords(plainText: string): number {
  const words = plainText.trim().match(/\S+/g);
  return words?.length ?? 0;
}

export function normalizePlainText(plainText: string): string {
  return plainText.replace(/\r\n/g, "\n").trim();
}

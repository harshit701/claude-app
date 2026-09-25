// Opaque cursors hide the underlying id from API consumers and leave room to
// change what a cursor encodes later without breaking the URL format.
export function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): string | undefined {
  try {
    const id = Buffer.from(cursor, "base64url").toString("utf8");
    return id.length > 0 ? id : undefined;
  } catch {
    return undefined;
  }
}

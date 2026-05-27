import type { JSONContent } from "@tiptap/core";

/** Matches `pronode_vault` + optional share table in Supabase. */
export type PronodeVaultRow = {
  id: string;
  title: string;
  node_type: string;
  content: JSONContent | null;
  updated_at?: string | null;
};

export const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export const SHARES_TABLE = "pronode_vault_shares";

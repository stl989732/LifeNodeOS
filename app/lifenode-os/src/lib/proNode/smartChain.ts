import { CLAUSE_LIBRARY } from "./clauses";
import type { ClauseBlock } from "./types";

/**
 * Smart-Chain Templates: after inserting a primary block, suggest matching follow-ups.
 */
const CHAIN_MAP: Record<string, string[]> = {
  "c-teach-1": ["c-teach-hw"],
  "c-teach-2": ["c-teach-hw"],
  "c-legal-1": ["c-legal-2", "c-uni-1"],
  "c-med-1": ["c-med-2"],
  "c-eng-1": ["c-uni-1"],
  "c-tech-1": ["c-uni-1"],
  "c-coach-1": ["c-uni-1"],
  "c-design-1": ["c-uni-1"],
};

export function getSmartChainSuggestions(afterClauseId: string): ClauseBlock[] {
  const ids = CHAIN_MAP[afterClauseId];
  if (!ids?.length) return [];
  return ids
    .map((id) => CLAUSE_LIBRARY.find((c) => c.id === id))
    .filter((c): c is ClauseBlock => Boolean(c));
}

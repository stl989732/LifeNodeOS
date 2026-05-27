import type { ProRoleId } from "./types";

export const PRO_WORKSPACE_ROLE_STORAGE_KEY = "lifenode.pro-workspace-role.v1";

/** Supabase `event_table.node_type` values allowed per profession workspace. */
export const PRO_ROLE_NODE_TYPES: Record<ProRoleId, string[]> = {
  legal: ["legal", "attorney"],
  medical: ["medical", "doctor"],
  engineering: ["engineering", "engineer"],
  teacher: ["teacher", "parent-check-in"],
  tech: ["tech", "it"],
  coach: ["coach"],
  designer: ["designer"],
};

export function isProRoleId(value: string): value is ProRoleId {
  return Object.prototype.hasOwnProperty.call(PRO_ROLE_NODE_TYPES, value);
}

export function readProWorkspaceRole(): ProRoleId {
  if (typeof window === "undefined") return "legal";
  try {
    const raw = window.localStorage.getItem(PRO_WORKSPACE_ROLE_STORAGE_KEY);
    if (raw && isProRoleId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "legal";
}

export function writeProWorkspaceRole(role: ProRoleId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRO_WORKSPACE_ROLE_STORAGE_KEY, role);
}

export function getNodeTypesForProRole(role: ProRoleId): string[] {
  return PRO_ROLE_NODE_TYPES[role] ?? PRO_ROLE_NODE_TYPES.legal;
}

/** Vault `pronode_vault.node_type` labels (Title Case) for the active profession. */
export function getVaultNodeTypesForProRole(role: ProRoleId): string[] {
  const map: Record<ProRoleId, string[]> = {
    legal: ["Legal"],
    medical: ["Medical"],
    engineering: ["Engineering"],
    teacher: ["Teacher"],
    tech: ["Tech"],
    coach: ["Coach"],
    designer: ["Designer"],
  };
  return map[role] ?? ["General"];
}

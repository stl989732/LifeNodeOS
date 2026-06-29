import type { ShellHatKey } from "@/lib/node-mappings";
import type { PlanKey } from "./plans";

export type PlanEntitlements = {
  plan: PlanKey;
  displayName: string;
  aiCreditsDaily: number;
  features: {
    linos_assistant: number;
    vanode_ai: number;
    biznode_ai: number;
    lifepulse_plan: number;
    lifepulse_intake: number;
    chef_text: number;
    chef_image: number;
  };
  nodes: ShellHatKey[];
  maxIntegrations: number;
  maxVaClients: number;
  maxTrackers: number;
  maxKanbanBoards: number;
  maxInvoices: number;
  maxEodRecords: number;
  maxTranscriptions: number;
  /** Full recipe generations per UTC month (recipe + chef_execute). */
  maxChefRecipesMonthly: number;
  whiteboardEnabled: boolean;
  logicBridges: boolean;
};

export const PLAN_ENTITLEMENTS: Record<PlanKey, PlanEntitlements> = {
  core: {
    plan: "core",
    displayName: "Core",
    aiCreditsDaily: 20,
    features: {
      linos_assistant: 12,
      vanode_ai: 4,
      biznode_ai: 3,
      lifepulse_plan: 2,
      lifepulse_intake: 10,
      chef_text: 3,
      chef_image: 0,
    },
    nodes: ["work", "va", "home"],
    maxIntegrations: 2,
    maxVaClients: 2,
    maxTrackers: 3,
    maxKanbanBoards: 1,
    maxInvoices: 2,
    maxEodRecords: 2,
    maxTranscriptions: 2,
    maxChefRecipesMonthly: 2,
    whiteboardEnabled: true,
    logicBridges: false,
  },
  sync: {
    plan: "sync",
    displayName: "Sync",
    aiCreditsDaily: 150,
    features: {
      linos_assistant: 75,
      vanode_ai: 25,
      biznode_ai: 18,
      lifepulse_plan: 12,
      lifepulse_intake: 25,
      chef_text: 20,
      chef_image: 10,
    },
    nodes: ["work", "va", "home", "vital"],
    maxIntegrations: 12,
    maxVaClients: 8,
    maxTrackers: 40,
    maxKanbanBoards: 10,
    maxInvoices: 20,
    maxEodRecords: 20,
    maxTranscriptions: 20,
    maxChefRecipesMonthly: 20,
    whiteboardEnabled: true,
    logicBridges: true,
  },
  nexus: {
    plan: "nexus",
    displayName: "Nexus",
    aiCreditsDaily: 1000,
    features: {
      linos_assistant: 250,
      vanode_ai: 50,
      biznode_ai: 40,
      lifepulse_plan: 30,
      lifepulse_intake: 60,
      chef_text: 60,
      chef_image: 40,
    },
    nodes: ["work", "va", "home", "vital", "trader", "pro"],
    maxIntegrations: 999,
    maxVaClients: 999,
    maxTrackers: 999,
    maxKanbanBoards: 999,
    maxInvoices: 999,
    maxEodRecords: 999,
    maxTranscriptions: 999,
    maxChefRecipesMonthly: 40,
    whiteboardEnabled: true,
    logicBridges: true,
  },
};

export function getPlanEntitlements(plan: PlanKey): PlanEntitlements {
  return PLAN_ENTITLEMENTS[plan];
}

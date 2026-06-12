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
};

export const PLAN_ENTITLEMENTS: Record<PlanKey, PlanEntitlements> = {
  core: {
    plan: "core",
    displayName: "Core",
    aiCreditsDaily: 25,
    features: {
      linos_assistant: 15,
      vanode_ai: 5,
      biznode_ai: 3,
      lifepulse_plan: 2,
      lifepulse_intake: 5,
      chef_text: 3,
      chef_image: 0,
    },
    nodes: ["work", "va"],
    maxIntegrations: 3,
    maxVaClients: 1,
    maxTrackers: 5,
  },
  sync: {
    plan: "sync",
    displayName: "Sync",
    aiCreditsDaily: 120,
    features: {
      linos_assistant: 60,
      vanode_ai: 20,
      biznode_ai: 15,
      lifepulse_plan: 10,
      lifepulse_intake: 20,
      chef_text: 15,
      chef_image: 8,
    },
    nodes: ["work", "va", "home", "vital"],
    maxIntegrations: 10,
    maxVaClients: 5,
    maxTrackers: 30,
  },
  nexus: {
    plan: "nexus",
    displayName: "Nexus",
    aiCreditsDaily: 500,
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
  },
};

export function getPlanEntitlements(plan: PlanKey): PlanEntitlements {
  return PLAN_ENTITLEMENTS[plan];
}

import type { PlanEntitlements } from "@/src/lib/billing/planEntitlements";

export type MeterFeatureKey = keyof PlanEntitlements["features"];

export type MeterEventKey =
  | "linos_assistant_message"
  | "linos_assistant_biz"
  | "vanode_ai"
  | "lifepulse_intake"
  | "lifepulse_plan";

export type MeterEventDef = {
  eventKey: MeterEventKey;
  credits: number;
  featureKey: MeterFeatureKey;
};

export const METER_EVENTS: Record<MeterEventKey, MeterEventDef> = {
  linos_assistant_message: {
    eventKey: "linos_assistant_message",
    credits: 1,
    featureKey: "linos_assistant",
  },
  linos_assistant_biz: {
    eventKey: "linos_assistant_biz",
    credits: 2,
    featureKey: "biznode_ai",
  },
  vanode_ai: {
    eventKey: "vanode_ai",
    credits: 2,
    featureKey: "vanode_ai",
  },
  lifepulse_intake: {
    eventKey: "lifepulse_intake",
    credits: 1,
    featureKey: "lifepulse_intake",
  },
  lifepulse_plan: {
    eventKey: "lifepulse_plan",
    credits: 2,
    featureKey: "lifepulse_plan",
  },
};

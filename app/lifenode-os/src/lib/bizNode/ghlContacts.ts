import { sanitizeAndTruncate } from "@/lib/truncation";
import { scoreLeadIntent } from "./dealTriage";

export type GhlContact = Record<string, unknown>;

export type MappedCrmLead = {
  source: string;
  lead_name: string;
  intake_notes: string;
  intent_label: string;
  intent_level: "high" | "medium" | "low";
  stage: string;
  external_id: string;
};

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function collectTextFields(contact: GhlContact): string {
  const parts: string[] = [];
  const push = (label: string, value: unknown) => {
    const s = asString(value);
    if (s) parts.push(`${label}: ${s}`);
  };

  push("email", contact.email);
  push("phone", contact.phone);
  push("company", contact.companyName ?? contact.company);
  push("tags", Array.isArray(contact.tags) ? contact.tags.join(", ") : contact.tags);
  push("source", contact.source);
  push("type", contact.type);

  const custom = contact.customFields ?? contact.customField;
  if (Array.isArray(custom)) {
    for (const field of custom) {
      if (field && typeof field === "object") {
        const rec = field as Record<string, unknown>;
        push(
          asString(rec.name ?? rec.key ?? "field"),
          rec.value ?? rec.fieldValue,
        );
      }
    }
  }

  const notes = contact.notes ?? contact.note;
  if (typeof notes === "string") parts.push(notes);
  if (Array.isArray(notes)) {
    for (const n of notes) {
      if (typeof n === "string") parts.push(n);
      else if (n && typeof n === "object") {
        const rec = n as Record<string, unknown>;
        push("note", rec.body ?? rec.text ?? rec.content);
      }
    }
  }

  return sanitizeAndTruncate(parts.join(" · "), 8000);
}

export function mapGhlContactToLead(contact: GhlContact): MappedCrmLead | null {
  const id = asString(contact.id ?? contact.contactId);
  const first = asString(contact.firstName ?? contact.first_name);
  const last = asString(contact.lastName ?? contact.last_name);
  const name =
    [first, last].filter(Boolean).join(" ").trim() ||
    asString(contact.name) ||
    asString(contact.email) ||
    "CRM contact";

  const intake_notes = collectTextFields(contact);
  const scored = scoreLeadIntent(intake_notes, name);

  return {
    source: "gohighlevel",
    lead_name: sanitizeAndTruncate(name, 240),
    intake_notes: intake_notes || "Synced from GoHighLevel — no notes on file.",
    intent_label: scored.intent_label,
    intent_level: scored.intent_level,
    stage: "intake",
    external_id: id || `ghl-${name.toLowerCase().replace(/\s+/g, "-")}`,
  };
}

export async function fetchGhlContacts(accessToken: string): Promise<GhlContact[]> {
  const url = new URL("https://services.leadconnectorhq.com/contacts/");
  url.searchParams.set("limit", "100");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      Version: "2021-07-28",
    },
  });

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const detail =
      typeof payload.message === "string"
        ? payload.message
        : typeof payload.error === "string"
          ? payload.error
          : res.statusText;
    throw new Error(`GoHighLevel contacts fetch failed: ${detail}`);
  }

  const list =
    (Array.isArray(payload.contacts) && payload.contacts) ||
    (Array.isArray(payload.data) && payload.data) ||
    [];

  return list.filter((c) => c && typeof c === "object") as GhlContact[];
}

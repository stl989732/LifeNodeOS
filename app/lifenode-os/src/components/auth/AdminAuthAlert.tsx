"use client";

import { ShieldAlert } from "lucide-react";
import {
  adminForbiddenMessage,
  adminSignupBlockedMessage,
} from "@/src/lib/admin/adminAuth";

type Variant = "forbidden" | "signup-blocked" | "developer-hint";

const COPY: Record<Variant, { title: string; body: string }> = {
  forbidden: {
    title: "Admin access not allowed",
    body: adminForbiddenMessage(),
  },
  "signup-blocked": {
    title: "Admin registration unavailable",
    body: adminSignupBlockedMessage(),
  },
  "developer-hint": {
    title: "Developer admin sign-in",
    body: "Use the allowlisted email configured for LifeNode OS (Ann / developer team). After you create a regular account, sign in here with that same email to open the admin dashboard.",
  },
};

export default function AdminAuthAlert({ variant }: { variant: Variant }) {
  const copy = COPY[variant];
  return (
    <div
      className="flex items-start gap-2.5 rounded-xl border border-amber-400/35 bg-amber-400/10 px-4 py-3 text-xs text-amber-100"
      role="alert"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
      <div className="space-y-1">
        <p className="font-semibold text-amber-50">{copy.title}</p>
        <p className="text-amber-100/90 leading-relaxed">{copy.body}</p>
      </div>
    </div>
  );
}

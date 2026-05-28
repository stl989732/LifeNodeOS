"use client";

import { useEffect, useState } from "react";
import KitchenOnboarding from "./KitchenOnboarding";
import KitchenDashboard from "./KitchenDashboard";
import { KITCHEN_BG_CLASS, KITCHEN_TEXT } from "@/src/lib/homeNode/kitchenMintCream";

const SETUP_KEY = "lifenode.homenode.kitchen.setup.v1";

export default function KitchenHome() {
  const [setup, setSetup] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETUP_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.enabledStorage) && Array.isArray(parsed?.items)) {
          setSetup(parsed);
        }
      }
    } catch {
      // Ignore corrupt persisted setup; user will re-onboard.
    }
    setHydrated(true);
  }, []);

  function handleComplete(payload) {
    const merged = {
      enabledStorage: payload.enabledStorage,
      items: Array.isArray(payload.items) ? payload.items : [],
    };
    window.localStorage.setItem(SETUP_KEY, JSON.stringify(merged));
    setSetup(merged);
  }

  function handleReset() {
    window.localStorage.removeItem(SETUP_KEY);
    setSetup(null);
  }

  function handleItemsChange(newItems) {
    setSetup((prev) => {
      if (!prev) return prev;
      const next = { ...prev, items: newItems };
      window.localStorage.setItem(SETUP_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className={`${KITCHEN_BG_CLASS} ${KITCHEN_TEXT.body}`}>
      <div className="mx-auto max-w-[1400px] px-5 py-10 md:px-10 md:py-14">
        {!hydrated ? (
          <div className={`flex min-h-[40vh] items-center justify-center text-sm ${KITCHEN_TEXT.label}`}>
            Preparing your kitchen…
          </div>
        ) : setup ? (
          <KitchenDashboard
            items={setup.items}
            enabledStorage={setup.enabledStorage}
            onReset={handleReset}
            onItemsChange={handleItemsChange}
          />
        ) : (
          <KitchenOnboarding onComplete={handleComplete} />
        )}
      </div>
    </div>
  );
}

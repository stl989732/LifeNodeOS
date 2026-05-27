"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  loadLifeNodeSettings,
  saveLifeNodeSettings,
  appearanceToTheme,
  type LifeNodeSettings,
} from "@/src/lib/settings/lifeNodeSettings";
import {
  resolveLifeNodeTheme,
  useLifeNodeContext,
  type LifeNodeTheme,
} from "@/src/context/LifeNodeContext";

export function applySettingsToDocument(
  settings: LifeNodeSettings,
  routeTheme: LifeNodeTheme,
): void {
  const html = document.documentElement;
  html.dataset.lifenodeTheme = appearanceToTheme(
    settings.appearance,
    routeTheme,
  );
  html.dataset.lifenodeDensity = settings.density;
  html.style.colorScheme =
    settings.appearance === "dark" ||
    (settings.appearance === "system" &&
      (routeTheme === "deep-onyx" || routeTheme === "studio-gray"))
      ? "dark"
      : "light";
}

export function useLifeNodeSettings() {
  const { activeNode, theme: routeTheme } = useLifeNodeContext();
  const [settings, setSettings] = useState<LifeNodeSettings>(() =>
    loadLifeNodeSettings(),
  );

  const persist = useCallback((next: LifeNodeSettings) => {
    setSettings(next);
    saveLifeNodeSettings(next);
    applySettingsToDocument(next, routeTheme);
  }, [routeTheme]);

  const patch = useCallback(
    (partial: Partial<LifeNodeSettings>) => {
      persist({ ...settings, ...partial });
    },
    [settings, persist],
  );

  useEffect(() => {
    applySettingsToDocument(settings, routeTheme);
  }, [settings, routeTheme]);

  useEffect(() => {
    const onChange = () => setSettings(loadLifeNodeSettings());
    window.addEventListener("lifenode:settings-changed", onChange);
    return () => window.removeEventListener("lifenode:settings-changed", onChange);
  }, []);

  return { settings, patch, persist, routeTheme, activeNode };
}

/** Mount inside LifeNodeProvider — keeps theme in sync when route changes. */
export function LifeNodeSettingsEffects() {
  const pathname = usePathname();
  const { activeNode } = useLifeNodeContext();
  const routeTheme = resolveLifeNodeTheme(pathname, activeNode);
  const [settings, setSettings] = useState<LifeNodeSettings>(() =>
    loadLifeNodeSettings(),
  );

  useEffect(() => {
    applySettingsToDocument(settings, routeTheme);
  }, [settings, routeTheme]);

  useEffect(() => {
    const sync = () => setSettings(loadLifeNodeSettings());
    window.addEventListener("lifenode:settings-changed", sync);
    return () => window.removeEventListener("lifenode:settings-changed", sync);
  }, []);

  return null;
}

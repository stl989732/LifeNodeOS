"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { usePlanEntitlements } from "@/src/context/PlanEntitlementsContext";
import {
  clearCheckoutSuccessSession,
  isCheckoutSuccessQuery,
  markCheckoutSuccessSession,
  readCheckoutSuccessSession,
} from "@/src/lib/billing/checkoutSuccess";

const FONT_OUTFIT = "font-[family-name:var(--font-outfit)]";
const CONFETTI_LOTTIE_SRC =
  "https://lottie.host/12a6a5f8-d52d-40fc-91d8-583080811c22/Bgl4Dc2y8s.lottie";
const DOTLOTTIE_SCRIPT =
  "https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js";
const BANNER_BORDER = "rgba(0, 250, 171, 0.35)";

let dotLottieScriptPromise: Promise<void> | null = null;

function loadDotLottieScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (customElements.get("dotlottie-wc")) return Promise.resolve();
  if (dotLottieScriptPromise) return dotLottieScriptPromise;

  dotLottieScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${DOTLOTTIE_SCRIPT}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("dotlottie")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = DOTLOTTIE_SCRIPT;
    script.type = "module";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("dotlottie"));
    document.head.appendChild(script);
  });

  return dotLottieScriptPromise;
}

function CheckoutConfettiLottie() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    void loadDotLottieScript()
      .then(() => {
        if (cancelled || !hostRef.current) return;
        const el = document.createElement("dotlottie-wc");
        el.setAttribute("src", CONFETTI_LOTTIE_SRC);
        el.setAttribute("autoplay", "");
        el.setAttribute("loop", "");
        el.style.width = "300px";
        el.style.height = "300px";
        el.style.maxWidth = "100%";
        hostRef.current.appendChild(el);
      })
      .catch(() => {
        /* confetti is decorative — banner still works */
      });

    return () => {
      cancelled = true;
      host.replaceChildren();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="flex items-center justify-center"
      aria-hidden
    />
  );
}

function CheckoutSuccessBannerInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { displayName, isPaid, loading, refresh } = usePlanEntitlements();
  const [dismissed, setDismissed] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(() => {
    if (typeof window === "undefined") return false;
    const fromUrl = isCheckoutSuccessQuery(window.location.search);
    if (fromUrl) markCheckoutSuccessSession();
    return fromUrl || readCheckoutSuccessSession();
  });

  useEffect(() => {
    const fromParams = searchParams.get("checkout") === "success";
    const fromUrl =
      typeof window !== "undefined" &&
      isCheckoutSuccessQuery(window.location.search);
    const active = fromParams || fromUrl || readCheckoutSuccessSession();

    if (fromParams || fromUrl) {
      markCheckoutSuccessSession();
    }
    setCheckoutSuccess(active);
  }, [searchParams]);

  const visible = checkoutSuccess && !dismissed;

  useEffect(() => {
    if (!visible) return;
    void refresh();
    const retry2s = window.setTimeout(() => void refresh(), 2000);
    const retry5s = window.setTimeout(() => void refresh(), 5000);
    return () => {
      window.clearTimeout(retry2s);
      window.clearTimeout(retry5s);
    };
  }, [visible, refresh]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    clearCheckoutSuccessSession();
    router.replace("/shell", { scroll: false });
  }, [router]);

  if (!visible) return null;

  const planStatus =
    isPaid && !loading
      ? `Your ${displayName} plan is active.`
      : loading
        ? "Your subscription is activating…"
        : "Your subscription is confirmed. Plan limits may take a few seconds to sync.";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${FONT_OUTFIT} relative mb-6 overflow-hidden rounded-2xl border bg-emerald-500/10 px-5 py-6 text-center shadow-[0_12px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl`}
      style={{ borderColor: BANNER_BORDER }}
    >
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center blur-[2px] opacity-80"
        aria-hidden
      >
        <CheckoutConfettiLottie />
      </div>

      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 z-20 rounded-lg p-1.5 text-emerald-200/80 transition hover:bg-emerald-500/15 hover:text-emerald-50"
        aria-label="Dismiss welcome message"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative z-10 mx-auto max-w-xl px-2">
        <p className="text-base font-semibold text-emerald-50">
          Welcome to LifeNode OS!
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-emerald-100/90">
          Thank you for upgrading. {planStatus} Pick a Node below to open your
          Unified Hub, connect integrations, and use your AI credits.
        </p>
        <p className="mt-2 text-xs text-emerald-200/70">
          If limits look unchanged, refresh once — billing can take a few
          seconds. Questions?{" "}
          <a
            href="mailto:support@los.lifenodeos.com"
            className="underline underline-offset-2 hover:text-emerald-100"
          >
            support@los.lifenodeos.com
          </a>
        </p>
      </div>
    </div>
  );
}

export default function CheckoutSuccessBanner() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessBannerInner />
    </Suspense>
  );
}

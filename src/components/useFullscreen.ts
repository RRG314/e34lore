"use client";
import { useEffect, useRef, useState } from "react";

export function useFullscreen() {
  const [native, setNative] = useState(false);
  const [fallback, setFallback] = useState(false);
  const target = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const update = () => setNative(Boolean(document.fullscreenElement));
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  useEffect(() => {
    if (!fallback || !target.current) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const element = target.current;
    document.body.style.overflow = "hidden";
    element.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setFallback(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        element.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]',
        ),
      ).filter((el) => el.getClientRects().length > 0);
      const first = focusable[0],
        last = focusable.at(-1);
      if (!first) {
        event.preventDefault();
        element.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === element)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("keydown", keys);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [fallback]);
  const toggle = async (element: HTMLElement | null) => {
    if (document.fullscreenElement) {
      setFallback(false);
      await document.exitFullscreen().catch(() => {});
      return;
    }
    if (fallback) {
      setFallback(false);
      return;
    }
    if (!element) return;
    target.current = element;
    setFallback(true);
    try {
      await element.requestFullscreen?.();
    } catch {
      /* Keep the in-page expanded view when native fullscreen is unavailable. */
    }
  };
  return { expanded: native || fallback, fallback, toggle };
}

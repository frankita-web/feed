"use client";

import { useEffect } from "react";

const KEY = "feed-scroll";

/**
 * Al recargar, la página arranca donde estaba y sube al inicio con una animación propia
 * (no "smooth" del navegador: con las animaciones reducidas de Windows sería instantánea).
 */
export function ScrollToTop() {
  useEffect(() => {
    history.scrollRestoration = "manual";
    const save = () => sessionStorage.setItem(KEY, String(window.scrollY));
    window.addEventListener("pagehide", save);

    const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    const from = Number(sessionStorage.getItem(KEY) ?? 0);
    sessionStorage.removeItem(KEY);
    if (entry?.type !== "reload" || from <= 0) return () => window.removeEventListener("pagehide", save);

    let frame = 0;
    let cancelled = false;
    const started = performance.now();
    const stop = () => (cancelled = true);
    window.addEventListener("wheel", stop, { passive: true, once: true });
    window.addEventListener("touchstart", stop, { passive: true, once: true });

    // El contenido aparece después de cargar los datos: se espera a que haya altura suficiente.
    const waitForContent = () => {
      if (cancelled) return;
      const room = document.documentElement.scrollHeight - window.innerHeight;
      if (room < from && performance.now() - started < 1500) {
        frame = requestAnimationFrame(waitForContent);
        return;
      }
      // Si el contenido no alcanzó a cargar, se queda arriba sin saltos.
      if (room < from) return;
      const start = from;
      window.scrollTo(0, start);
      const begin = performance.now();
      const duration = 700;
      const step = (now: number) => {
        if (cancelled) return;
        const t = Math.min(1, (now - begin) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        window.scrollTo(0, start * (1 - eased));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(waitForContent);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pagehide", save);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
    };
  }, []);
  return null;
}

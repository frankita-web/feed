"use client";

import { useSyncExternalStore } from "react";

export type ToastKind = "loading" | "ok" | "error";
export type Toast = { id: string; text: string; kind: ToastKind };

let toasts: Toast[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  listeners.forEach((l) => l());
}

export function dismiss(id: string) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/**
 * Aviso flotante a la derecha. Con el mismo `id`, reemplaza al anterior
 * (ej. "Escribiendo…" pasa a "Listo"). Los de resultado se van solos.
 */
export function notify(text: string, kind: ToastKind = "ok", id = crypto.randomUUID()) {
  const toast = { id, text, kind };
  toasts = toasts.some((t) => t.id === id)
    ? toasts.map((t) => (t.id === id ? toast : t))
    : [...toasts, toast];
  clearTimeout(timers.get(id));
  if (kind !== "loading") timers.set(id, setTimeout(() => dismiss(id), kind === "error" ? 9000 : 6000));
  emit();
  return id;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useToasts = () =>
  useSyncExternalStore(
    subscribe,
    () => toasts,
    () => toasts,
  );

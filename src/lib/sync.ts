"use client";

import { pushFile } from "./bank";
import { localFileIds, removeImage } from "./images";
import {
  adoptState,
  afterRescue,
  currentState,
  firstPullDone,
  replaceFileId,
  setSyncMeta,
  shared,
  syncMeta,
} from "./store";
import type { State } from "./types";

// El contenido vive en internet (api/estado), así se ve igual en cualquier computador o celular.
// Cada cambio se sube a los pocos segundos; al volver a la página se baja lo cambiado en otro lado.
// Nunca se pisa nada sin respaldo: si este navegador y internet tienen versiones distintas, Franca
// elige cuál usar y la otra queda guardada en respaldos/.

type Saved = { rev: number; savedAt: number; state: State };

let started = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<void> | null = null;
let again = false;
// "Después" en el aviso de dos versiones: no se sincroniza hasta recargar la página.
let paused = false;

export function startSync() {
  if (started) return;
  started = true;
  setTimeout(firstPullDone, 6000); // sin conexión, que igual se pueda usar lo de este navegador
  sync().finally(firstPullDone);
  window.addEventListener("focus", () => sync());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") sync();
  });
  setInterval(() => {
    if (document.visibilityState === "visible") sync();
  }, 60_000);
}

/** Después de un cambio: espera un momento por si vienen más y lo sube. */
export function scheduleSync() {
  clearTimeout(timer);
  timer = setTimeout(sync, 1500);
}

function sync(): Promise<void> {
  if (paused) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      // Con varias pestañas abiertas, solo una a la vez.
      if (navigator.locks) await navigator.locks.request("feed-estado", step);
      else await step();
    } catch (error) {
      console.error("sync", error);
    } finally {
      running = null;
      if (again) {
        again = false;
        sync();
      } else afterRescue().then(moveFiles);
    }
  })();
  return running;
}

async function step() {
  const response = await fetch("/api/estado", { cache: "no-store" });
  if (response.status === 401) return; // sin clave: la página ya manda a escribirla
  if (!response.ok) throw new Error(`estado: ${response.status}`);
  const { saved } = (await response.json()) as { saved: Saved | null };
  const meta = syncMeta();
  const local = currentState();

  if (!saved) {
    // Primera vez: lo de este navegador pasa a internet.
    if (meta.dirty) await push(local, null);
    return;
  }
  if (meta.rev === saved.rev) {
    if (meta.dirty) await push(local, saved.rev);
    return;
  }
  // En internet hay una versión más nueva, guardada desde otro computador.
  if (!meta.dirty || JSON.stringify(shared(local)) === JSON.stringify(saved.state)) {
    if (adoptState(saved.state, saved.rev)) scheduleSync();
    firstPullDone();
    return;
  }
  // Los dos lados cambiaron: que Franca elija.
  firstPullDone();
  const choice = await ask(local, saved);
  if (choice === "internet") {
    await backup(currentState());
    adoptState(saved.state, saved.rev);
  } else if (choice === "aqui") {
    // Reemplaza lo de internet; el servidor lo respalda antes.
    await push(currentState(), meta.rev, true);
  } else paused = true;
}

async function push(state: State, baseRev: number | null, force = false) {
  const response = await fetch("/api/estado", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: shared(state), baseRev, force }),
  });
  if (response.status === 409) {
    // Otro computador guardó recién: se vuelve a revisar.
    again = true;
    return;
  }
  if (!response.ok) throw new Error(`estado: ${response.status}`);
  const { rev } = (await response.json()) as { rev: number };
  // Si hubo cambios mientras se subía, quedan pendientes para la próxima.
  const changedMeanwhile = currentState() !== state;
  setSyncMeta({ rev, dirty: changedMeanwhile });
  if (changedMeanwhile) scheduleSync();
}

async function backup(state: State) {
  const response = await fetch("/api/estado", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, reason: "navegador" }),
  });
  if (!response.ok) throw new Error(`respaldo: ${response.status}`);
}

let moving = false;

/** Sube a internet las fotos y videos que el contenido usa y que estaban solo en este navegador. */
async function moveFiles() {
  if (moving || paused) return;
  moving = true;
  try {
    // Lo del banco lo sube bank.ts.
    const json = JSON.stringify(shared(currentState()));
    const ids = (await localFileIds()).filter((id) => json.includes(`"${id}"`));
    let done = 0;
    let failed = 0;
    for (const id of ids) {
      if (ids.length > 1)
        banner(`Subiendo tus fotos y videos a internet… ${done + 1} de ${ids.length}. No cierres esta página.`);
      try {
        const { url } = await pushFile(id);
        replaceFileId(id, url);
        await removeImage(id);
      } catch (error) {
        // Queda en el navegador y se reintenta la próxima vez.
        console.error(id, error);
        failed += 1;
      }
      done += 1;
    }
    if (ids.length > 1)
      banner(
        failed
          ? `Faltaron ${failed} archivos: se reintentan solos en un rato.`
          : "Listo: tus fotos y videos ya están en internet.",
        true,
      );
  } catch (error) {
    console.error(error);
  } finally {
    moving = false;
  }
}

function banner(text: string, done = false) {
  let box = document.getElementById("sync-banner");
  if (!box) {
    box = document.createElement("div");
    box.id = "sync-banner";
    box.setAttribute("role", "status");
    box.style.cssText =
      "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;max-width:min(560px,90vw);" +
      "background:#1d1818;color:#fff;padding:12px 16px;border-radius:16px;font-size:13px;line-height:1.4;" +
      "box-shadow:0 8px 24px rgba(0,0,0,.25)";
    document.body.append(box);
  }
  box.textContent = text;
  if (done) setTimeout(() => box.remove(), 5000);
}

const date = (ms: number) =>
  new Date(ms).toLocaleString("es", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function summary(s: State) {
  const times = [
    ...s.posts.map((x) => x.createdAt),
    ...(s.ideas ?? []).map((x) => x.createdAt),
    ...(s.shoots ?? []).map((x) => x.createdAt),
    ...(s.scripts ?? []).map((x) => x.updatedAt),
    // Lo de ejemplo trae fechas futuras: solo cuenta lo creado hasta hoy.
  ].filter((t) => Number.isFinite(t) && t <= Date.now());
  const parts = [
    `${s.projects.length} proyectos`,
    `${s.posts.length} publicaciones`,
    `${s.ideas?.length ?? 0} ideas`,
    `${s.scripts?.length ?? 0} guiones`,
    `${s.shoots?.length ?? 0} shoots`,
  ];
  if (times.length) parts.push(`lo más nuevo: ${date(Math.max(...times))}`);
  return parts.join(" · ");
}

/** Aviso para elegir entre la versión de internet y la de este navegador. */
function ask(local: State, saved: Saved): Promise<"internet" | "aqui" | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;" +
      "padding:16px;background:rgba(0,0,0,.35)";
    const card = document.createElement("div");
    card.style.cssText =
      "max-width:520px;width:100%;background:#fff;color:#1d1818;border-radius:20px;padding:24px;" +
      "font-size:14px;line-height:1.45;box-shadow:0 12px 40px rgba(0,0,0,.25)";

    const title = document.createElement("h2");
    title.textContent = "Hay dos versiones de tu contenido";
    title.style.cssText = "font-size:18px;font-weight:600;margin:0 0 8px";
    const text = document.createElement("p");
    text.textContent =
      "Este navegador tiene cambios que no están en internet, y en internet hay otra versión " +
      "guardada desde otro computador. Elige cuál usar: la otra queda respaldada, no se pierde.";
    text.style.cssText = "margin:0 0 16px;color:#555";
    card.append(title, text);

    const close = (choice: "internet" | "aqui" | null) => {
      overlay.remove();
      resolve(choice);
    };
    const option = (label: string, detail: string, choice: "internet" | "aqui") => {
      const button = document.createElement("button");
      button.type = "button";
      button.style.cssText =
        "display:block;width:100%;text-align:left;margin:0 0 10px;padding:14px 16px;border-radius:14px;" +
        "border:1px solid #ddd;background:#f7f5f3;color:inherit;font:inherit;cursor:pointer";
      const strong = document.createElement("strong");
      strong.textContent = label;
      strong.style.cssText = "display:block;margin-bottom:4px";
      const small = document.createElement("span");
      small.textContent = detail;
      small.style.cssText = "font-size:12px;color:#666";
      button.append(strong, small);
      button.onclick = () => close(choice);
      return button;
    };
    card.append(
      option(
        "Usar la de internet",
        `Guardada el ${date(saved.savedAt)}. ${summary(saved.state)}`,
        "internet",
      ),
      option("Usar la de este navegador", summary(local), "aqui"),
    );
    const later = document.createElement("button");
    later.type = "button";
    later.textContent = "Decidir después";
    later.style.cssText =
      "margin-top:4px;padding:8px 0;border:0;background:none;color:#777;font:inherit;cursor:pointer";
    later.onclick = () => close(null);
    card.append(later);

    overlay.append(card);
    document.body.append(overlay);
  });
}

"use client";

import { useState, type FormEvent } from "react";
import { darkButtonClass, inputClass } from "@/components/Modal";

export default function EntrarPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const response = await fetch("/api/entrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    if (response?.ok) {
      const back = new URLSearchParams(location.search).get("volver") ?? "/";
      location.href = back.startsWith("/") && !back.startsWith("//") ? back : "/";
      return;
    }
    setBusy(false);
    setError(true);
  };

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={submit} className="silver w-full max-w-sm space-y-4 rounded-[24px] p-6">
        <h1 className="text-2xl leading-none font-semibold tracking-[-0.04em]">Contenido</h1>
        <p className="text-[13px] text-graphite">Escribe la clave para entrar.</p>
        <input
          autoFocus
          type="password"
          autoComplete="current-password"
          aria-label="Clave"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-[13px] text-red-700">Esa clave no es. Prueba de nuevo.</p>}
        <button type="submit" disabled={busy || !password} className={darkButtonClass}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}

"use client";

import { useState } from "react";
import { notify } from "@/lib/toast";
import { buttonClass } from "./Modal";

/** Arma el PDF y lo descarga. */
export function PdfButton({ make }: { make: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      className={buttonClass}
      onClick={async () => {
        setBusy(true);
        notify("Armando el PDF…", "loading", "pdf");
        try {
          await make();
          notify("PDF descargado.", "ok", "pdf");
        } catch (error) {
          console.error(error);
          notify("No se pudo armar el PDF. Inténtalo de nuevo.", "error", "pdf");
        }
        setBusy(false);
      }}
    >
      {busy ? "Preparando PDF…" : "Descargar PDF"}
    </button>
  );
}

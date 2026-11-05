"use client";

import { useState } from "react";
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
        try {
          await make();
        } catch (error) {
          console.error(error);
          alert("No se pudo armar el PDF. Inténtalo de nuevo.");
        }
        setBusy(false);
      }}
    >
      {busy ? "Preparando PDF…" : "Descargar PDF"}
    </button>
  );
}

import { z } from "zod";

/** Lo que la IA puede cambiar del guion. Solo se envían los campos que cambian. */
export const scriptPatchSchema = z.object({
  title: z.string().optional().describe("Nombre corto del video"),
  duration: z.string().optional().describe('Duración total, ej. "20 s"'),
  hook: z.string().optional().describe("Gancho: lo que pasa y se dice en los primeros 3 segundos"),
  scenes: z
    .array(
      z.object({
        shot: z.string().describe('Plano o encuadre, ej. "Detalle cenital de la pizza"'),
        action: z.string().describe("Qué pasa en la toma"),
        onScreen: z.string().describe("Texto en pantalla (vacío si no hay)"),
        audio: z.string().describe("Voz en off, diálogo, sonido o música"),
        seconds: z.string().describe('Duración de la toma, ej. "3"'),
      }),
    )
    .optional()
    .describe("Lista completa de tomas, en orden. Reemplaza todas las tomas actuales."),
  closing: z.string().optional().describe("Cierre / llamado a la acción"),
  notes: z.string().optional().describe("Notas de producción: props, locación, quién sale, etc."),
});

export type ScriptPatch = z.infer<typeof scriptPatchSchema>;

/** Contexto que manda la app junto con cada mensaje. */
export type ScriptContext = {
  project: { name: string; instagram: string; pillars: string[] };
  post?: {
    title: string;
    date: string | null;
    format: string;
    pillar: string | null;
    caption: string;
  };
  script: ScriptPatch & { status: string };
  drinks?: { name: string; diageo: boolean }[];
};

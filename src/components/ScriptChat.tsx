"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { useEffect, useRef, useState } from "react";
import type { ScriptContext, ScriptPatch } from "@/lib/script-tool";
import { updateScript } from "@/lib/store";
import type { Post, Project, Script } from "@/lib/types";

const SUGGESTIONS = [
  "Armemos este guion desde cero",
  "Dame 3 ideas de gancho",
  "Ajústalo a 15 segundos",
  "Escribe el copy para Instagram",
];

// Hay un solo chat abierto a la vez: el guion visible manda su contexto en cada mensaje.
let currentContext: ScriptContext | null = null;
const transport = new DefaultChatTransport({
  api: "/api/guion",
  body: () => ({ context: currentContext }),
});

/** Ventanita para pedirle a la IA que arme o cambie el guion abierto. */
export function ScriptChat({
  script,
  project,
  post,
  onPatch,
}: {
  script: Script;
  project: Project;
  post?: Post;
  /** Aplica en el guion abierto lo que escribió la IA. */
  onPatch: (patch: ScriptPatch) => void;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Lo que la IA ve en cada mensaje: el guion tal como está ahora.
  const context: ScriptContext = {
    project: {
      name: project.name,
      instagram: project.instagram,
      pillars: project.pillars.map((p) => p.name),
    },
    post: post && {
      title: post.title,
      date: post.date,
      format: post.format,
      pillar: post.pillar,
      caption: post.caption,
    },
    script: {
      title: script.title,
      status: script.status,
      duration: script.duration,
      hook: script.hook,
      scenes: script.scenes.map(({ shot, action, onScreen, audio, seconds }) => ({
        shot,
        action,
        onScreen,
        audio,
        seconds,
      })),
      closing: script.closing,
      notes: script.notes,
    },
    drinks: project.drinks?.map((d) => ({ name: d.name, diageo: d.diageo })),
  };
  useEffect(() => {
    currentContext = context;
  });

  const { messages, setMessages, sendMessage, addToolOutput, status, error, stop } = useChat({
    id: script.id,
    messages: (script.chat as UIMessage[] | undefined) ?? [],
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall({ toolCall }) {
      if (toolCall.dynamic || toolCall.toolName !== "actualizarGuion") return;
      onPatch(toolCall.input as ScriptPatch);
      addToolOutput({
        tool: "actualizarGuion",
        toolCallId: toolCall.toolCallId,
        output: "Listo, el guion quedó actualizado en el documento.",
      });
    },
    onFinish({ messages }) {
      updateScript(script.id, (s) => ({ ...s, chat: messages }));
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const busy = status === "submitted" || status === "streaming";
  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <section className="silver flex h-[min(78vh,760px)] flex-col overflow-hidden rounded-[24px] 2xl:sticky 2xl:top-6">
      <header className="flex items-center justify-between border-b border-black/[0.06] px-5 py-3.5">
        <div>
          <p className="text-[15px] font-semibold tracking-[-0.01em]">Armar con IA</p>
          <p className="text-[12px] text-graphite">Cuéntame la idea y la escribo en el guion</p>
        </div>
        {messages.length > 0 && !busy && (
          <button
            onClick={() => {
              if (!confirm("¿Borrar la conversación? El guion no se borra.")) return;
              setMessages([]);
              updateScript(script.id, (s) => ({ ...s, chat: [] }));
            }}
            className="text-[12px] text-graphite hover:text-ink"
          >
            Limpiar
          </button>
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-2 pt-2">
            <p className="px-1 text-[13px] text-graphite">Prueba con:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-left text-[13px] hover:bg-white"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-[13px] text-white"
                  : "space-y-2 text-[13px] leading-relaxed"
              }
            >
              {m.parts.map((part, i) => {
                if (part.type === "text")
                  return (
                    <p key={i} className="whitespace-pre-wrap">
                      {part.text}
                    </p>
                  );
                if (part.type === "tool-actualizarGuion")
                  return (
                    <p
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/80 px-2.5 py-1 text-[12px] text-graphite"
                    >
                      ✎{" "}
                      {part.state === "output-available"
                        ? "Guion actualizado"
                        : "Escribiendo en el guion…"}
                    </p>
                  );
                return null;
              })}
            </div>
          </div>
        ))}

        {status === "submitted" && <p className="text-[13px] text-graphite">Pensando…</p>}
        {error && (
          <p className="rounded-xl bg-white/80 px-3 py-2 text-[12px] text-graphite">
            {error.message.startsWith("SETUP: ") ? (
              <>
                {error.message.slice(7)}{" "}
                <a
                  href="https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-ink underline"
                >
                  Activar ↗
                </a>
              </>
            ) : (
              error.message || "No pude responder. Revisa tu conexión e intenta de nuevo."
            )}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t border-black/[0.06] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ej. reel de 15 s del Flotador, que se vea la nieve de limón…"
          className="min-h-11 flex-1 resize-none rounded-2xl border border-black/10 bg-white px-3.5 py-2.5 text-[13px] outline-none focus:border-black/40"
        />
        {busy ? (
          <button
            type="button"
            onClick={stop}
            className="h-11 rounded-full bg-white px-4 text-[13px] ring-1 ring-black/10"
          >
            Parar
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="h-11 rounded-full bg-ink px-4 text-[13px] font-medium text-white disabled:opacity-40"
          >
            Enviar
          </button>
        )}
      </form>
    </section>
  );
}

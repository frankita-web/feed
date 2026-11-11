import { get } from "@vercel/blob";
import { NextResponse, connection, type NextRequest } from "next/server";
import { COOKIE, validSession } from "@/lib/auth";
import type { AgendaItem } from "@/lib/agenda";
import { AGENDA_FILE } from "../agenda/route";

// Mail diario de las 8:00 (hora de Ciudad de México) con lo que toca publicar ese día.
// Lo llama el horario de Vercel (vercel.json) con CRON_SECRET. Con ?prueba=1 y la sesión
// de la página, muestra el mail sin enviarlo.

const ZONE = "America/Mexico_City";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(new Date());

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function email(items: AgendaItem[], date: string) {
  const day = new Intl.DateTimeFormat("es-MX", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00Z`));
  const subject = `Hoy toca publicar: ${items.length} ${items.length === 1 ? "post" : "posts"} · ${day}`;
  const blocks = items.map(
    (item) => `
      <tr><td style="padding:18px 0;border-top:1px solid #e6e6e6">
        <p style="margin:0 0 4px;font:600 12px Helvetica,Arial;color:#8a8a8a;text-transform:uppercase;letter-spacing:.06em">${escape(item.project)}${item.time ? ` · ${item.time}` : ""} · ${escape(item.format)}</p>
        <p style="margin:0 0 8px;font:700 17px Helvetica,Arial;color:#1d1818">${escape(item.title || "Sin título")}</p>
        <p style="margin:0;font:15px/1.5 Helvetica,Arial;color:#1d1818;white-space:pre-wrap">${escape(item.caption || "(sin copy todavía)")}</p>
        ${item.videoLink ? `<p style="margin:8px 0 0"><a href="${escape(item.videoLink.startsWith("http") ? item.videoLink : `https://${item.videoLink}`)}" style="font:600 14px Helvetica,Arial;color:#1d1818">Ver video</a></p>` : ""}
      </td></tr>`,
  );
  const html = `<div style="max-width:560px;margin:0 auto;padding:24px">
    <p style="margin:0 0 4px;font:700 22px Helvetica,Arial;color:#1d1818">Hoy toca publicar</p>
    <p style="margin:0 0 12px;font:15px Helvetica,Arial;color:#6e6a6a;text-transform:capitalize">${day}</p>
    <table width="100%" cellpadding="0" cellspacing="0">${blocks.join("")}</table>
    <p style="margin:20px 0 0;font:13px Helvetica,Arial;color:#8a8a8a">
      <a href="https://contenido-feed-franca-mandiola-estudio.vercel.app" style="color:#8a8a8a">Abrir la página</a>
    </p></div>`;
  return { subject, html };
}

export async function GET(request: NextRequest) {
  await connection();
  // Con CRON_SECRET se exige; sin él, se acepta el horario de Vercel (en el peor caso, alguien
  // haría llegar el recordatorio a Franca antes de tiempo).
  const fromCron = process.env.CRON_SECRET
    ? request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
    : (request.headers.get("user-agent") ?? "").startsWith("vercel-cron");
  const preview = request.nextUrl.searchParams.get("prueba") === "1";
  const signedIn = await validSession(request.cookies.get(COOKIE)?.value);
  if (!fromCron && !(preview && signedIn))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const date = request.nextUrl.searchParams.get("dia") ?? today();
  const file = await get(AGENDA_FILE, { access: "private", useCache: false });
  const agenda =
    file?.statusCode === 200
      ? ((await new Response(file.stream).json()) as { items: AgendaItem[]; savedAt: string })
      : { items: [], savedAt: null };
  const items = agenda.items.filter((item) => item.date === date);
  if (!items.length) return NextResponse.json({ date, sent: false, reason: "Nada para hoy" });

  const message = email(items, date);
  if (preview) return NextResponse.json({ date, preview: true, savedAt: agenda.savedAt, ...message });

  const to = process.env.REMINDER_TO;
  if (!process.env.RESEND_API_KEY || !to)
    return NextResponse.json({ date, sent: false, reason: "Falta configurar Resend" }, { status: 500 });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.REMINDER_FROM ?? "Contenido <onboarding@resend.dev>",
      to: [to],
      subject: message.subject,
      html: message.html,
    }),
  });
  const result = await response.json().catch(() => null);
  return NextResponse.json({ date, sent: response.ok, result }, { status: response.ok ? 200 : 502 });
}

import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { NextResponse, connection } from "next/server";
import type { BankItem } from "@/lib/types";

// Un solo archivo con la lista del banco: leerlo y escribirlo gasta mucho menos que listar.
const LIST = "banco.json";

async function readList() {
  const result = await get(LIST, { access: "private", useCache: false });
  if (result?.statusCode !== 200) return { items: [] as BankItem[], etag: undefined };
  const items = (await new Response(result.stream).json()) as BankItem[];
  return { items, etag: result.blob.etag };
}

/** Cambia la lista sin pisar lo que otro dispositivo haya guardado al mismo tiempo. */
async function change(apply: (items: BankItem[]) => BankItem[]) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { items, etag } = await readList();
    const next = apply(items);
    try {
      await put(LIST, JSON.stringify(next), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        cacheControlMaxAge: 60,
        ...(etag ? { ifMatch: etag } : {}),
      });
      return next;
    } catch (error) {
      if (!(error instanceof BlobPreconditionFailedError)) throw error;
    }
  }
  throw new Error("No se pudo guardar el banco");
}

export async function GET() {
  await connection();
  const { items } = await readList();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const { add = [], remove = [] } = (await request.json()) as {
    add?: BankItem[];
    remove?: string[];
  };
  const incoming = new Set(add.map((x) => x.id));
  const gone = new Set(remove);
  const items = await change((list) => [
    ...add,
    ...list.filter((x) => !incoming.has(x.id) && !gone.has(x.id)),
  ]);
  return NextResponse.json({ items });
}

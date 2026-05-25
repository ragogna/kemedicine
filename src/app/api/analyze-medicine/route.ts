import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { verifyAuthToken } from "@/lib/auth-middleware";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    await verifyAuthToken(req);
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const image = formData.get("image") as File | null;

    if (!image) return NextResponse.json({ error: "Immagine mancante" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(image.type as typeof ALLOWED_TYPES[number])) {
      return NextResponse.json({ error: "Formato non supportato" }, { status: 400 });
    }
    if (image.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Immagine troppo grande (max 5MB)" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY mancante" }, { status: 500 });
    const client = new Anthropic({ apiKey });

    const buffer = await image.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mediaType = image.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Analizza questa immagine che può contenere UNO O PIÙ medicinali/farmaci italiani.
Per OGNI medicinale visibile, restituisci un oggetto nell'array.
Rispondi SOLO con un array JSON valido senza markdown:
[
  {
    "name": "nome commerciale",
    "brand": "casa farmaceutica",
    "activeIngredient": "principio attivo e dosaggio",
    "category": "uno tra: analgesico|antibiotico|vitamina|antinfiammatorio|antiistaminico|gastroprotettore|cardiovascolare|dermologico|altro",
    "expiryDate": "se visibile: YYYY-MM-DD oppure MM/YYYY (es. 06/2026). Se solo mese/anno scritto a mano, usa MM/YYYY. Altrimenti null",
    "quantity": numero intero o null,
    "unit": "pz|mg|ml|compresse|capsule|fiale|bustine|flaconi"
  }
]
Se non vedi medicinali, restituisci array vuoto [].`,
            },
          ],
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json([]);
    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(Array.isArray(data) ? data : [data]);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Analyze error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

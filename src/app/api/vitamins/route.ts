import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { verifyAuthToken } from "@/lib/auth-middleware";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MedicineSchema = z.object({
  name: z.string().max(200),
  brand: z.string().max(200).optional(),
  activeIngredient: z.string().max(300).optional(),
  expiryDate: z.string(),
  quantity: z.number().optional(),
  unit: z.string().max(20).optional(),
});

const RequestSchema = z.object({
  medicines: z.array(MedicineSchema).max(100),
});

const MONTHS_IT = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

export async function POST(req: NextRequest) {
  try {
    await verifyAuthToken(req);
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  const vitamins = parsed.medicines.filter((m) =>
    /vitamin|integrat|supplement|omega|magnesio|calcio|ferro|zinco|probio|collagen/i.test(
      `${m.name} ${m.activeIngredient ?? ""}`
    )
  );

  if (vitamins.length === 0) {
    return NextResponse.json({ tips: [] });
  }

  const currentMonth = MONTHS_IT[new Date().getMonth()];
  const vitaminList = vitamins
    .map((m) => `- ${m.name}${m.brand ? ` (${m.brand})` : ""} | Scadenza: ${m.expiryDate} | Qtà: ${m.quantity ?? "?"} ${m.unit ?? ""}`)
    .join("\n");

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: `Sei un nutrizionista italiano esperto di integrazione vitaminica e stagionalità.
Analizza le vitamine/integratori dell'inventario e fornisci consigli pratici personalizzati su:
- Quando consumarli in base alla stagione attuale (${currentMonth}) e al clima italiano
- Priorità di consumo in base alla scadenza (prima quelli che scadono prima)
- Benefici specifici stagionali (es. vitamina D d'inverno, vitamina C nei cambi stagione)
Rispondi SOLO con JSON valido: {"tips": [{"name": "nome vitamina", "advice": "consiglio pratico conciso"}]}`,
      messages: [
        {
          role: "user",
          content: `Mese attuale: ${currentMonth}\n\nVitamine nell'inventario:\n${vitaminList}`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Risposta AI non valida");
    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error("Vitamins error:", error);
    return NextResponse.json({ error: "Errore AI" }, { status: 500 });
  }
}

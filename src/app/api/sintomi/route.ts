import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { verifyAuthToken } from "@/lib/auth-middleware";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MedicineSchema = z.object({
  id: z.string(),
  name: z.string().max(200),
  brand: z.string().max(200).optional(),
  activeIngredient: z.string().max(300).optional(),
  category: z.string().max(50),
  expiryDate: z.string(),
  quantity: z.number().optional(),
  unit: z.string().max(20).optional(),
});

const RequestSchema = z.object({
  symptoms: z.string().min(3).max(1000).trim(),
  medicines: z.array(MedicineSchema).max(200),
});

export async function POST(req: NextRequest) {
  try {
    await verifyAuthToken(req);
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let parsed;
  try {
    const body = await req.json();
    parsed = RequestSchema.parse(body);
  } catch {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  try {
    const { symptoms, medicines } = parsed;

    const inventoryText = medicines
      .map((m) => `- ${m.name}${m.brand ? ` (${m.brand})` : ""} | ${m.activeIngredient ?? "N/D"} | ${m.category}`)
      .join("\n");

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: `Sei un assistente farmaceutico italiano esperto.
Hai accesso all'inventario medicinali dell'utente.
Fornisci consigli orientativi sui medicinali disponibili nell'inventario, ordinati per efficacia.
Per ogni medicinale spiega brevemente perché è utile, l'ordine di efficacia, e eventuali avvertenze.
Includi sempre il disclaimer che si tratta di informazioni orientative e non sostituiscono il medico.
Segnala se alcuni medicinali non dovrebbero essere combinati tra loro.
Rispondi in italiano, in modo chiaro e conciso.
Se ci sono vitamine nell'inventario che scadono entro 6 mesi, suggerisci quando consumarle (campo "tips").
Rispondi SOLO con JSON valido (niente markdown): {"text": "risposta principale", "tips": ["tip1"]}`,
      messages: [
        {
          role: "user",
          content: `Sintomi: ${symptoms}\n\nInventario disponibile:\n${inventoryText}`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Risposta AI non valida");
    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Sintomi error:", error);
    return NextResponse.json({ error: "Errore AI" }, { status: 500 });
  }
}

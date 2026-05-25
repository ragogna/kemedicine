import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { verifyAuthToken } from "@/lib/auth-middleware";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    await verifyAuthToken(req);
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { name, activeIngredient, category } = await req.json();
  if (!name) return NextResponse.json({ error: "Nome mancante" }, { status: 400 });

  const prompt = `Sei un farmacista italiano esperto. Per il medicinale "${name}"${activeIngredient ? ` (principio attivo: ${activeIngredient})` : ""}${category ? ` (categoria: ${category})` : ""}, fornisci una scheda rapida in italiano, massimo 2 frasi per sezione.

Rispondi SOLO con JSON valido:
{
  "indicazioni": "A cosa serve (1-2 frasi brevi)",
  "effettiCollaterali": "Principali effetti collaterali (1-2 frasi brevi)",
  "modalitaUso": "Come e quando si prende (1-2 frasi brevi)"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 350,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no json");
    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Impossibile caricare le informazioni" }, { status: 500 });
  }
}

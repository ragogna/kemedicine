import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { verifyAuthToken } from "@/lib/auth-middleware";

const CATEGORY_MAP: Record<string, string> = {
  "en:analgesics": "analgesico",
  "en:antibiotics": "antibiotico",
  "en:vitamins": "vitamina",
  "en:dietary-supplements": "vitamina",
  "en:food-supplements": "vitamina",
  "en:anti-inflammatory-drugs": "antinfiammatorio",
  "en:antihistamines": "antiistaminico",
  "en:gastroprotectors": "gastroprotettore",
};

function mapCategory(tags: string[] = []): string {
  for (const tag of tags) {
    const mapped = CATEGORY_MAP[tag.toLowerCase()];
    if (mapped) return mapped;
  }
  const joined = tags.join(" ").toLowerCase();
  if (/antibiot/.test(joined)) return "antibiotico";
  if (/analges|painkill/.test(joined)) return "analgesico";
  if (/vitamin|supplement|integrat/.test(joined)) return "vitamina";
  if (/antinfiammator|anti-inflam/.test(joined)) return "antinfiammatorio";
  if (/antistamin|antiistamin/.test(joined)) return "antiistaminico";
  if (/gastro/.test(joined)) return "gastroprotettore";
  return "altro";
}

async function lookupWithAI(code: string): Promise<{ found: boolean; name?: string; brand?: string; activeIngredient?: string; category?: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `Il codice a barre EAN di un farmaco italiano è: ${code}

Se conosci questo farmaco con certezza, rispondi SOLO con JSON nel formato:
{"found":true,"name":"Nome farmaco","brand":"Produttore","activeIngredient":"Principio attivo e dosaggio","category":"<categoria>"}

Dove <categoria> è uno di: analgesico, antibiotico, vitamina, antinfiammatorio, antiistaminico, gastroprotettore, cardiovascolare, dermologico, altro

Se non sei sicuro al 100% del farmaco corrispondente a questo EAN, rispondi SOLO con:
{"found":false}

Nessun altro testo, solo JSON.`,
      }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch {
    return null;
  }
}

async function lookupOpenFoodFacts(code: string): Promise<{ found: boolean; name?: string; brand?: string; category?: string } | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=product_name,product_name_it,brands,categories_tags`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const name = (p.product_name_it || p.product_name || "").trim();
    if (!name) return null;
    return {
      found: true,
      name,
      brand: (p.brands?.split(",")[0] ?? "").trim(),
      category: mapCategory(p.categories_tags ?? []),
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    await verifyAuthToken(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  // 1. Try AI identification (knows Italian pharmaceutical barcodes)
  const aiResult = await lookupWithAI(code);
  if (aiResult?.found) return NextResponse.json(aiResult);

  // 2. Fallback to Open Food Facts
  const offResult = await lookupOpenFoodFacts(code);
  if (offResult?.found) return NextResponse.json(offResult);

  return NextResponse.json({ found: false });
}

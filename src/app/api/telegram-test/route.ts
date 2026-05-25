import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth-middleware";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminDb = getFirestore();

async function sendTelegramMessage(chatId: string, text: string): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return "TELEGRAM_BOT_TOKEN mancante";
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  const data = await res.json();
  if (!data.ok) return data.description ?? "Errore sconosciuto";
  return null;
}

export async function POST(req: NextRequest) {
  let uid: string;
  try {
    uid = await verifyAuthToken(req);
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  // Only owner (uid === familyId) can test
  const profileDoc = await adminDb.collection("userProfiles").doc(uid).get();
  if (!profileDoc.exists) return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });
  const familyId = profileDoc.data()!.familyId as string;
  if (uid !== familyId) return NextResponse.json({ error: "Solo il proprietario può testare" }, { status: 403 });

  const settingsDoc = await adminDb
    .collection("families").doc(familyId)
    .collection("settings").doc("main")
    .get();

  if (!settingsDoc.exists) return NextResponse.json({ error: "Nessuna impostazione trovata" }, { status: 404 });

  const contacts: Array<{ name: string; chatId: string }> = settingsDoc.data()!.telegramChatIds ?? [];
  if (!contacts.length) return NextResponse.json({ error: "Nessun contatto Telegram configurato" }, { status: 400 });

  const message = `✅ <b>KeMedicine — Test Notifica</b>\n\nIl sistema di avvisi Telegram è attivo e funzionante!\n\nRiceverai notifiche automatiche ogni mattina per medicinali in scadenza.\n\n<i>Test inviato manualmente dall'app.</i>`;

  const errors: string[] = [];
  let sent = 0;
  for (const contact of contacts) {
    const err = await sendTelegramMessage(contact.chatId, message);
    if (err) errors.push(`${contact.name} (${contact.chatId}): ${err}`);
    else sent++;
  }

  if (errors.length)
    return NextResponse.json({ ok: false, sent, errors }, { status: 500 });

  return NextResponse.json({ ok: true, sent });
}

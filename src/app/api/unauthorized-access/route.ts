import { NextRequest, NextResponse } from "next/server";
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

async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "sconosciuta";
    const ua = typeof body.userAgent === "string" ? body.userAgent.slice(0, 300) : "sconosciuto";

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "sconosciuto";

    const timestamp = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });

    const message =
      `🚨 <b>KeMedicine — Accesso Non Autorizzato</b>\n\n` +
      `📧 <b>Email:</b> <code>${email}</code>\n` +
      `🌐 <b>IP:</b> <code>${ip}</code>\n` +
      `🕐 <b>Data/Ora:</b> ${timestamp}\n` +
      `📱 <b>Dispositivo:</b> <code>${ua}</code>`;

    // collection group query: finds all "settings" docs named "main" across all families
    // (families/{id} top-level doc may not exist explicitly — only subcollections do)
    const settingsSnap = await adminDb.collectionGroup("settings").get();
    const contacts: Array<{ name: string; chatId: string }> = [];
    for (const snap of settingsSnap.docs) {
      if (snap.id !== "main") continue;
      const list = snap.data().telegramChatIds ?? [];
      contacts.push(...list);
    }

    for (const contact of contacts) {
      await sendTelegramMessage(contact.chatId, message);
    }
  } catch {
    // silently fail — don't leak server details
  }

  return NextResponse.json({ ok: true });
}

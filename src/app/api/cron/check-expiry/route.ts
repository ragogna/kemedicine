import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { differenceInDays, parseISO } from "date-fns";

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

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familiesSnap = await adminDb.collection("families").get();
  let notified = 0;

  for (const familyDoc of familiesSnap.docs) {
    const settingsDoc = await adminDb
      .collection("families")
      .doc(familyDoc.id)
      .collection("settings")
      .doc("main")
      .get();

    if (!settingsDoc.exists) continue;
    const settings = settingsDoc.data()!;
    const alertDays: number = settings.alertDaysBefore ?? 30;
    const contacts: Array<{ name: string; chatId: string }> = settings.telegramChatIds ?? [];

    if (!contacts.length) continue;

    const medicinesSnap = await adminDb
      .collection("families")
      .doc(familyDoc.id)
      .collection("medicines")
      .get();

    const today = new Date();
    const expiring = [];
    const expired = [];

    for (const medDoc of medicinesSnap.docs) {
      const med = medDoc.data() as { name: string; expiryDate: string };
      const days = differenceInDays(parseISO(med.expiryDate), today);
      // Notify only on the exact threshold day or on expiry day itself
      if (days === 0) expired.push({ ...med, days });
      else if (days === alertDays) expiring.push({ ...med, days });
    }

    if (!expiring.length && !expired.length) continue;

    let message = `💊 <b>KeMedicine — Avviso Scadenze</b>\n\n`;

    if (expired.length) {
      message += `🔴 <b>SCADUTI (${expired.length}):</b>\n`;
      expired.forEach((m) => {
        message += `• ${m.name} — scaduto da ${Math.abs(m.days)} giorni\n`;
      });
      message += "\n";
    }

    if (expiring.length) {
      message += `⚠️ <b>IN SCADENZA (${expiring.length}):</b>\n`;
      expiring.forEach((m) => {
        message += `• ${m.name} — scade tra ${m.days} giorni\n`;
      });
    }

    for (const contact of contacts) {
      await sendTelegramMessage(contact.chatId, message);
      notified++;
    }
  }

  return NextResponse.json({ ok: true, notified });
}

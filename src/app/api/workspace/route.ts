import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthToken } from "@/lib/auth-middleware";
import { getApps, initializeApp, cert } from "firebase-admin/app";
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

const WorkspaceSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), name: z.string().min(1).max(40) }),
  z.object({ action: z.literal("rename"), id: z.string(), name: z.string().min(1).max(40) }),
  z.object({ action: z.literal("delete"), id: z.string() }),
]);

async function verifyOwner(uid: string): Promise<boolean> {
  const profile = await adminDb.doc(`userProfiles/${uid}`).get();
  const familyId = profile.exists ? profile.data()?.familyId : uid;
  return familyId === uid;
}

async function getWorkspaces(familyId: string): Promise<{ id: string; name: string; members: string[] }[]> {
  const snap = await adminDb.doc(`families/${familyId}/settings/workspaces`).get();
  return snap.exists ? (snap.data()?.list ?? []) : [];
}

async function saveWorkspaces(familyId: string, list: { id: string; name: string; members: string[] }[]) {
  await adminDb.doc(`families/${familyId}/settings/workspaces`).set({ list });
}

export async function POST(req: NextRequest) {
  let uid: string;
  try {
    uid = await verifyAuthToken(req);
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  if (!(await verifyOwner(uid))) {
    return NextResponse.json({ error: "Solo il proprietario può gestire le aree" }, { status: 403 });
  }

  let parsed;
  try {
    parsed = WorkspaceSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  const list = await getWorkspaces(uid);

  if (parsed.action === "create") {
    const id = `ws_${Date.now()}`;
    list.push({ id, name: parsed.name, members: [] });
    await saveWorkspaces(uid, list);
    return NextResponse.json({ ok: true, id });
  }

  if (parsed.action === "rename") {
    const ws = list.find((w) => w.id === parsed.id);
    if (!ws) return NextResponse.json({ error: "Area non trovata" }, { status: 404 });
    ws.name = parsed.name;
    await saveWorkspaces(uid, list);
    return NextResponse.json({ ok: true });
  }

  if (parsed.action === "delete") {
    const updated = list.filter((w) => w.id !== parsed.id);
    await saveWorkspaces(uid, updated);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthToken } from "@/lib/auth-middleware";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { sanitizeEmail } from "@/lib/family";

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
const adminAuth = getAuth();

const InviteSchema = z.object({
  email: z.string().email(),
  action: z.enum(["add", "remove"]),
  workspaceId: z.string().optional().default("default"),
});

export async function POST(req: NextRequest) {
  let uid: string;
  try {
    uid = await verifyAuthToken(req);
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = InviteSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  // Verify caller is owner
  const profileSnap = await adminDb.doc(`userProfiles/${uid}`).get();
  const callerFamilyId = profileSnap.exists ? profileSnap.data()?.familyId : uid;
  if (callerFamilyId !== uid) {
    return NextResponse.json({ error: "Solo il proprietario può gestire i membri" }, { status: 403 });
  }

  const sanitized = sanitizeEmail(parsed.email);
  const inviteRef = adminDb.doc(`emailInvites/${sanitized}`);

  if (parsed.action === "add") {
    await inviteRef.set({
      familyId: uid,
      workspaceId: parsed.workspaceId,
      email: parsed.email,
      createdAt: new Date().toISOString(),
    });

    // Update existing user profile immediately if the user already exists
    try {
      const existingUser = await adminAuth.getUserByEmail(parsed.email);
      await adminDb.doc(`userProfiles/${existingUser.uid}`).set({
        familyId: uid,
        workspaceId: parsed.workspaceId,
        email: parsed.email,
        role: "member",
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch {
      // User doesn't have a Firebase Auth account yet — invite handles first login
    }

    return NextResponse.json({ ok: true });
  } else {
    await inviteRef.delete();

    // Revoke existing user's access immediately
    try {
      const existingUser = await adminAuth.getUserByEmail(parsed.email);
      await adminDb.doc(`userProfiles/${existingUser.uid}`).delete();
    } catch {
      // User not in Firebase Auth
    }

    return NextResponse.json({ ok: true });
  }
}

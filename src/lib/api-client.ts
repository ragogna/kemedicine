import { auth } from "@/lib/firebase";

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Non autenticato");
  return user.getIdToken();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Errore" }));
    throw new Error(err.error ?? "Errore server");
  }
  return res.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Errore" }));
    throw new Error(err.error ?? "Errore server");
  }
  return res.json();
}

export async function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Errore" }));
    throw new Error(err.error ?? "Errore server");
  }
  return res.json();
}

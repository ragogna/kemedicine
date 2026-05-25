"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 480, margin: "0 auto" }}>
      <h2 style={{ color: "#dc2626" }}>Errore</h2>
      <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: 4, fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap" }}>
        {error?.message || "Errore sconosciuto"}
        {"\n"}
        {error?.stack}
      </pre>
      {error?.digest && <p style={{ fontSize: 12, color: "#666" }}>Digest: {error.digest}</p>}
      <button onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}>
        Riprova
      </button>
    </div>
  );
}

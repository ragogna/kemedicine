"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 480 }}>
        <h2 style={{ color: "#dc2626" }}>Errore applicazione</h2>
        <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: 4, fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap" }}>
          {error?.message || "Errore sconosciuto"}
          {"\n"}
          {error?.stack}
        </pre>
        {error?.digest && <p style={{ fontSize: 12, color: "#666" }}>Digest: {error.digest}</p>}
        <button onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}>
          Riprova
        </button>
      </body>
    </html>
  );
}

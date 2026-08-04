"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "2rem",
            fontFamily: "sans-serif",
            background: "#F7F8FA",
          }}
        >
          <h1 style={{ color: "#1F3864", fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.5rem" }}>
            Konek hit a snag
          </h1>
          <p style={{ color: "#1F386499", marginBottom: "2rem" }}>
            Please refresh the page. Nothing was charged.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#1F3864",
              color: "white",
              fontWeight: 600,
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              border: "none",
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}

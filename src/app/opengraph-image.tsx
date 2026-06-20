import { ImageResponse } from "next/og"

/** Node.js evita limite de 1 MB de Edge Functions no plano Vercel. */
export const runtime = "nodejs"
export const alt = "Azulli — Sua empresa no azul"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 45%, #0284c7 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: -2,
            marginBottom: 24,
          }}
        >
          Azulli
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 600,
            lineHeight: 1.25,
            maxWidth: 900,
            marginBottom: 32,
          }}
        >
          Sua empresa no azul, sua mente em paz.
        </div>
        <div
          style={{
            fontSize: 24,
            opacity: 0.9,
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          Lançamentos, OFX, previsão de caixa e assistente IA para MEIs e
          pequenas empresas.
        </div>
      </div>
    ),
    { ...size }
  )
}

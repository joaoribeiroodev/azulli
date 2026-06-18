import type { Metadata } from "next"
import { Inter, Poppins } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { CookieConsentBanner } from "@/components/cookie-consent/cookie-consent-banner"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Azulli — Sua empresa no azul, sua mente em paz.",
  description:
    "Gestão financeira inteligente para MEIs e pequenas empresas: lançamentos, OFX, previsão de caixa e assistente IA.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://use.azulli.app.br"
  ),
  openGraph: {
    title: "Azulli — Sua empresa no azul",
    description:
      "Organize receitas e despesas, importe extrato OFX e veja o futuro do seu caixa.",
    siteName: "Azulli",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Azulli",
    description: "Gestão financeira com IA para pequenas empresas.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${poppins.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <CookieConsentBanner />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}

import { LandingContainer, LandingSection, SectionHeader } from "./primitives"

export function LandingAbout() {
  return (
    <LandingSection id="sobre" muted className="py-12 sm:py-14 lg:py-16">
      <LandingContainer>
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeader
            title="Sobre o Azulli"
            description="Gestão financeira pensada para quem precisa de clareza, não de mais planilhas."
          />
          <div className="mt-6 sm:mt-8 space-y-4 text-base sm:text-lg text-muted-foreground leading-relaxed text-pretty">
            <p>
              O Azulli é uma plataforma feita para MEIs e pequenas empresas no
              Brasil. Reunimos lançamentos, importação OFX, área do contador e
              relatórios em um só lugar — em português, sem complicação.
            </p>
            <p>
              No trial de 7 dias, você experimenta também previsão de caixa,
              assistente IA e e-mails automáticos do plano Empresarial. Depois,
              escolhe Pro (core financeiro) ou Empresarial (com IA e automações).
            </p>            <p>
              Nossa missão é simples:{" "}
              <span className="font-medium text-brand-ink">
                colocar sua empresa no azul e deixar sua mente em paz.
              </span>
            </p>
          </div>
        </div>
      </LandingContainer>
    </LandingSection>
  )
}

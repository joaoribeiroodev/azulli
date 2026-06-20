import { FinderLoginForm } from "@/components/finder/finder-login-form"

export const metadata = {
  title: "Entrar — Azulli Finder",
}

export default function FinderLoginPage() {
  return (
    <>
      <link rel="stylesheet" href="/finder/css/app.css" />
      <FinderLoginForm />
    </>
  )
}

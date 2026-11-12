import type { Metadata } from "next";

import { SignInClient } from "./SignInClient";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description:
    "Entra con Google o con GitHub. Sin contraseñas y sin códigos.",

  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return <SignInClient />;
}

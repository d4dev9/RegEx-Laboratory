import Link from "next/link";
import { LogoMark } from "@/components/shared/Logo";

const SUGGESTIONS = [
  { href: "/", label: "Inicio", hint: "Vuelve a la portada" },
  { href: "/lab", label: "Laboratorio", hint: "Escribe y prueba una regex" },
  { href: "/cheatsheet", label: "Cheatsheet", hint: "Sintaxis a mano" },
  { href: "/docs", label: "Documentación", hint: "Guía y patrones comunes" },
];

export default function NotFound() {
  return (
    <main className="notfound">
      <LogoMark size={40} />

      <p className="notfound-code">404</p>
      <h1 className="notfound-title">No encontramos esta página</h1>
      <p className="notfound-lead">
        Puede que el enlace tenga un error, o que el patrón que compartías ya no
        sea público.
      </p>

      <nav className="notfound-actions" aria-label="Páginas principales">
        {SUGGESTIONS.map((item) => (
          <Link key={item.href} href={item.href} className="btn btn-primary">
            <span className="notfound-label">{item.label}</span>
            <span className="notfound-hint">{item.hint}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}

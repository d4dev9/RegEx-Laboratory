import { NextResponse } from "next/server";

import { formatZodError, isZodError } from "@/lib/validations";
import type { QuotaViolation } from "@/lib/quota";

export function badRequest(error: unknown) {
  if (isZodError(error)) {
    return NextResponse.json(
      { error: "Datos inválidos", fields: formatZodError(error) },
      { status: 400 }
    );
  }
  return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
}

export function internalError(context: string, error: unknown) {

  console.error("[api]", context, error);
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}

export function unauthorized(message = "No autenticado") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "No autorizado") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Recurso no encontrado") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function quotaExceeded(violation: QuotaViolation) {
  return NextResponse.json(
    {
      error: "Has alcanzado el límite de tu cuenta.",
      code: "quota",
      kind: violation.kind,
      limit: violation.limit,
      used: violation.used,
    },
    { status: 429 }
  );
}

/** The request body was larger than the limit allows. */
export function bodyTooLarge() {
  return NextResponse.json(
    { error: "Cuerpo de la petición demasiado grande" },
    { status: 413 }
  );
}
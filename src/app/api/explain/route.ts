import { NextRequest, NextResponse } from "next/server";
import { explainRegex } from "@/lib/regex/explainer";
import { exportAllLanguages } from "@/lib/regex/exporter";
import { compileUserRegex } from "@/lib/regex/safety";
import { explainSchema, formatZodError, isZodError } from "@/lib/validations";
import { BodyTooLargeError, readJsonBody } from "@/lib/request-body";

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody(request);
    const parsed = explainSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", fields: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { regex, flags } = parsed.data;

    const compiled = compileUserRegex(regex, flags);
    if (!compiled.ok) {
      return NextResponse.json(
        {
          error: compiled.error,
          redos: compiled.redos?.map(({ rule, index, fragment, message }) => ({
            rule,
            index,
            fragment,
            message,
          })),
        },
        { status: 400 }
      );
    }

    const tokens = explainRegex(regex);
    const exports = exportAllLanguages(regex, flags);

    return NextResponse.json({
      tokens,
      exports,
      regex,
      flags,
    });
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return NextResponse.json(
        { error: "Cuerpo de la petición demasiado grande" },
        { status: 413 }
      );
    }
    if (isZodError(error)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    console.error("POST /api/explain error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
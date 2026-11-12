import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/auth/session";
import { bodyTooLarge, internalError, unauthorized } from "@/lib/api-response";
import { BodyTooLargeError, readJsonBody } from "@/lib/request-body";
import { AuthError, deleteAuthIdentity } from "@/lib/auth/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getDbUser();
    if (!user) return unauthorized();

    return Response.json({
      id: user.authId,
      alias: user.name ?? user.email.split("@")[0],
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    return internalError("GET /api/account error:", error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getDbUser();
    if (!user) return unauthorized();

    const body = (await readJsonBody(request)) as { alias?: string };
    const alias = (body.alias ?? "").trim();

    if (!alias) {
      return NextResponse.json(
        { error: "El alias no puede estar vacío." },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(alias)) {
      return NextResponse.json(
        { error: "De 3 a 20 caracteres: letras, números y guion bajo." },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: alias },
      select: { name: true },
    });

    return NextResponse.json({ alias: updated.name });
  } catch (error) {
    if (error instanceof BodyTooLargeError) return bodyTooLarge();
    return internalError("PATCH /api/account error:", error);
  }
}

export async function DELETE() {
  try {
    const user = await getDbUser();
    if (!user) return unauthorized();

    await prisma.user.delete({ where: { id: user.id } });

    await deleteAuthIdentity(user.authId);

    const store = await cookies();
    store.delete("rl-session");
    store.delete("rl-refresh");

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {

      return Response.json(
        {
          error:
            "Se borraron tus datos, pero la identidad de acceso sigue activa. Escríbenos para terminarla.",
          partial: true,
        },
        { status: 502 }
      );
    }
    return internalError("DELETE /api/account error:", error);
  }
}

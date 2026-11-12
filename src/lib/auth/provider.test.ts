import { describe, expect, it } from "vitest";

import { toAuthUser, type SessionUser } from "@/lib/auth/supabase";

function token(provider: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: "user-1",
      amr: [{ method: "oauth", provider }],
      exp: 9999999999,
    })
  ).toString("base64url");
  return `header.${payload}.signature`;
}

function dualLinked(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "user-1",
    email: "ada@gmail.com",
    created_at: "2026-01-15T10:00:00Z",
    last_sign_in_at: "2026-03-14T08:00:00Z",

    app_metadata: { provider: "google", providers: ["google", "github"] },
    identities: [
      {
        provider: "google",
        created_at: "2026-01-15T10:00:00Z",
        updated_at: "2026-01-15T10:00:00Z",
        identity_data: {
          picture: "https://lh3.googleusercontent.com/a/google-avatar",
          email: "ada@gmail.com",
        },
      },
      {
        provider: "github",
        created_at: "2026-03-01T10:00:00Z",
        updated_at: "2026-03-14T08:00:00Z",
        identity_data: {
          avatar_url: "https://avatars.githubusercontent.com/u/583231",
          user_name: "ada",
        },
      },
    ],
    user_metadata: {

      picture: "https://lh3.googleusercontent.com/a/google-avatar",
      full_name: "Ada Lovelace",
    },
    ...overrides,
  };
}

describe("proveedor de la sesión", () => {
  it("usa GitHub cuando la sesión se inició con GitHub", () => {
    const user = toAuthUser(dualLinked(), token("github"));

    expect(user.provider).toBe("github");
  });

  it("usa Google cuando la sesión se inició con Google", () => {
    const user = toAuthUser(dualLinked(), token("google"));

    expect(user.provider).toBe("google");
  });

  it("el avatar viene de la identidad que inició la sesión", () => {

    const github = toAuthUser(dualLinked(), token("github"));
    const google = toAuthUser(dualLinked(), token("google"));

    expect(github.avatarUrl).toBe("https://avatars.githubusercontent.com/u/583231");
    expect(google.avatarUrl).toBe("https://lh3.googleusercontent.com/a/google-avatar");
  });

  it("lee el campo de GitHub y el de Google, sin adivinar por el nombre", () => {

    const user = toAuthUser(
      {
        id: "u",
        email: "a@b.co",
        identities: [
          {
            provider: "github",
            updated_at: "2026-03-14T08:00:00Z",
            identity_data: { picture: "https://example.com/from-github.png" },
          },
        ],
        app_metadata: { provider: "github" },
      },
      token("github")
    );

    expect(user.avatarUrl).toBe("https://example.com/from-github.png");
  });
});

describe("proveedor cuando el token no se puede leer", () => {
  it("cae en la identidad mas reciente, no en la primera enlazada", () => {

    const user = toAuthUser(dualLinked(), undefined);

    expect(user.provider).toBe("github");
    expect(user.avatarUrl).toBe("https://avatars.githubusercontent.com/u/583231");
  });

  it("cae en app_metadata cuando el token no es un JWT", () => {
    const user = toAuthUser(dualLinked(), "no-es-un-jwt");

    expect(user.provider).toBe("github");
  });

  it("usa el proveedor declarado cuando no hay identidades enlazadas", () => {
    const user = toAuthUser(
      {
        id: "u",
        email: "a@b.co",
        app_metadata: { provider: "google" },
        identities: [],
      },
      undefined
    );

    expect(user.provider).toBe("google");
  });

  it("usa el primero de app_metadata.providers cuando no hay nada mas", () => {

    const user = toAuthUser(
      {
        id: "u",
        email: "a@b.co",
        app_metadata: { providers: ["google", "github"] },
      },
      undefined
    );

    expect(user.provider).toBe("google");
  });

  it("no inventa un proveedor cuando nada lo declara", () => {
    const user = toAuthUser({ id: "u", email: "a@b.co" }, undefined);

    expect(user.provider).toBeUndefined();
  });

  it("ignora un proveedor que no sea Google ni GitHub", () => {

    const user = toAuthUser(
      {
        id: "u",
        email: "a@b.co",
        identities: [{ provider: "discord", updated_at: "2026-03-14T08:00:00Z" }],
        app_metadata: { provider: "discord", providers: ["discord"] },
      },
      undefined
    );

    expect(user.provider).toBeUndefined();
  });
});

describe("el token manda, aunque contradiga a la cuenta", () => {
  it("el token gana sobre app_metadata.provider", () => {

    const user = toAuthUser(dualLinked(), token("github"));

    expect(user.provider).not.toBe("google");
  });

  it("lee el proveedor del claim `identity` cuando no hay `amr`", () => {
    const payload = Buffer.from(
      JSON.stringify({ sub: "user-1", identity: "github" })
    ).toString("base64url");

    const user = toAuthUser(dualLinked(), `header.${payload}.sig`);

    expect(user.provider).toBe("github");
  });
});

describe("el avatar se sanitiza venga de donde venga", () => {
  it("descarta una URL javascript: en identity_data", () => {

    const user = toAuthUser(
      {
        id: "u",
        email: "a@b.co",
        identities: [
          {
            provider: "github",
            updated_at: "2026-03-14T08:00:00Z",
            identity_data: { avatar_url: 'javascript:alert(document.cookie)' },
          },
        ],
        app_metadata: { provider: "github" },
      },
      token("github")
    );

    expect(user.avatarUrl).toBeUndefined();
  });

  it("deja el avatar sin definir para que caiga en las iniciales", () => {
    const user = toAuthUser(
      {
        id: "u",
        email: "ada@gmail.com",
        identities: [{ provider: "github", updated_at: "2026-03-14T08:00:00Z" }],
        app_metadata: { provider: "github" },
      },
      token("github")
    );

    expect(user.avatarUrl).toBeUndefined();
  });

  it("cae en user_metadata cuando la identidad no trae foto", () => {
    const user = toAuthUser(
      {
        id: "u",
        email: "a@b.co",
        user_metadata: { picture: "https://example.com/from-metadata.png" },
        identities: [
          { provider: "github", updated_at: "2026-03-14T08:00:00Z", identity_data: {} },
        ],
        app_metadata: { provider: "github" },
      },
      token("github")
    );

    expect(user.avatarUrl).toBe("https://example.com/from-metadata.png");
  });
});

describe("lo que el resto del menu sigue leyendo", () => {
  it("no rompe el alias, el correo ni las fechas", () => {
    const user = toAuthUser(dualLinked(), token("github"));

    expect(user.id).toBe("user-1");
    expect(user.email).toBe("ada@gmail.com");
    expect(user.alias).toBe("Ada Lovelace");
    expect(user.createdAt).toBe("2026-01-15T10:00:00Z");
    expect(user.lastSignInAt).toBe("2026-03-14T08:00:00Z");
  });
});
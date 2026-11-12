import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const URL_BASE = "https://project.supabase.co";
const ANON = "anon-key";

vi.hoisted(() => {
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_ANON_KEY = "anon-key";
});

const { refreshSession } = await import("@/lib/auth/supabase");

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function tokens() {
  return {
    access_token: "nuevo.access.token",
    refresh_token: "refresh-rotado",
  };
}

describe("la llamada de refresco", () => {
  it("va al endpoint de refresh con el token en el cuerpo", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(tokens()), { status: 200 })
    );

    await refreshSession("refresh-original");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${URL_BASE}/auth/v1/token?grant_type=refresh_token`);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ refresh_token: "refresh-original" }));

    expect(init.headers.apikey).toBe(ANON);
  });

  it("devuelve el par de tokens nuevo", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(tokens()), { status: 200 })
    );

    await expect(refreshSession("refresh-original")).resolves.toEqual(tokens());
  });

  it("falla en voz alta si Supabase no esta configurado", async () => {

    vi.resetModules();
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    const { refreshSession: withoutConfig } = await import("@/lib/auth/supabase");

    await expect(withoutConfig("x")).rejects.toMatchObject({
      code: "not_configured",
    });
  });
});

describe("un refresh rechazado", () => {
  it("un 400 dice que la sesion caducó, no que la red fallo", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 400 }));

    await expect(refreshSession("caducado")).rejects.toMatchObject({
      code: "refresh_invalid",
    });
  });

  it("un 401 tambien dice que la sesion caducó", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));

    await expect(refreshSession("caducado")).rejects.toMatchObject({
      code: "refresh_invalid",
    });
  });

  it("un 5xx NO dice que la sesion caducó", async () => {

    fetchMock.mockResolvedValue(new Response("{}", { status: 503 }));

    await expect(refreshSession("todavia-bueno")).rejects.toMatchObject({
      code: "refresh_failed_503",
    });
  });

  it("un cuerpo que no es JSON cuenta como fallo, no como exito vacio", async () => {
    fetchMock.mockResolvedValue(new Response("<html>502</html>", { status: 200 }));

    await expect(refreshSession("x")).rejects.toThrow();
  });
});
import { describe, expect, it } from "vitest";

import {
  BodyTooLargeError,
  MAX_API_BODY_BYTES,
  readJsonBody,
} from "@/lib/request-body";
import { trustedOrigin } from "@/lib/auth/origin";

function request(body: string, headers: Record<string, string> = {}): Request {
  return new Request("https://regexlab.indevs.in/api/auth", {
    method: "POST",
    headers,
    body,
  });
}

describe("readJsonBody", () => {
  it("lee un cuerpo JSON normal", async () => {
    const body = await readJsonBody(request('{"action":"oauth"}'));

    expect(body).toEqual({ action: "oauth" });
  });

  it("lee un cuerpo troceado, que no declara longitud", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"action":'));
        controller.enqueue(new TextEncoder().encode('"oauth"}'));
        controller.close();
      },
    });

    const body = await readJsonBody(
      new Request("https://regexlab.indevs.in/api/auth", {
        method: "POST",
        headers: { "transfer-encoding": "chunked" },
        body: stream,
        duplex: "half",
      } as RequestInit)
    );

    expect(body).toEqual({ action: "oauth" });
  });

  it("rechaza un cuerpo que pasa del limite", async () => {
    const huge = "a".repeat(MAX_API_BODY_BYTES + 1);

    await expect(readJsonBody(request(huge))).rejects.toBeInstanceOf(
      BodyTooLargeError
    );
  });

  it("rechaza un cuerpo troceado que pasa del limite", async () => {
    const chunk = new TextEncoder().encode("a".repeat(64 * 1024));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < 8; i++) controller.enqueue(chunk);
        controller.close();
      },
    });

    await expect(
      readJsonBody(
        new Request("https://regexlab.indevs.in/api/auth", {
          method: "POST",
          body: stream,
          duplex: "half",
        } as RequestInit)
      )
    ).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it("rechaza un cuerpo que no es JSON", async () => {
    await expect(readJsonBody(request("esto no es json"))).rejects.toThrow();
  });
});

describe("trustedOrigin", () => {
  it("acepta el origen canonico", () => {
    const req = new Request("https://regexlab.indevs.in/api/auth");

    expect(trustedOrigin(req)).toBe("https://regexlab.indevs.in");
  });

  it("acepta los dominios de la plataforma, que es donde vive una vista previa", () => {
    const req = new Request("https://regex-lab-abc123.vercel.app/api/auth");

    expect(trustedOrigin(req)).toBe("https://regex-lab-abc123.vercel.app");
  });

  it("descarta un Host falsificado", () => {
    const req = new Request("https://attacker.example/api/auth");

    expect(trustedOrigin(req)).toBe("https://regexlab.indevs.in");
  });

  it("descarta un Host que solo imita al canonico", () => {
    const req = new Request("https://regexlab.indevs.in.attacker.example/api/auth");

    expect(trustedOrigin(req)).toBe("https://regexlab.indevs.in");
  });
});

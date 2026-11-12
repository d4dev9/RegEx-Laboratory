import { describe, expect, it } from "vitest";

import {
  allowedOrigins,
  canonicalOrigin,
  hasJsonContentType,
  isAllowedOrigin,
} from "@/lib/auth/origin";

function request(entries: Record<string, string>): Request {
  return new Request("https://regexlab.indevs.in/auth/callback", {
    method: "POST",
    headers: new Headers(entries),
  });
}

describe("hasJsonContentType", () => {
  it("accepts a JSON body", () => {
    expect(
      hasJsonContentType(request({ "content-type": "application/json" }))
    ).toBe(true);
  });

  it("accepts it with a charset", () => {
    expect(
      hasJsonContentType(
        request({ "content-type": "application/json; charset=utf-8" })
      )
    ).toBe(true);
  });

  it("rejects the content types a form can send", () => {

    expect(hasJsonContentType(request({ "content-type": "text/plain" }))).toBe(
      false
    );
    expect(
      hasJsonContentType(
        request({ "content-type": "application/x-www-form-urlencoded" })
      )
    ).toBe(false);
    expect(hasJsonContentType(request({}))).toBe(false);
  });
});

describe("isAllowedOrigin", () => {
  it("accepts the site's own origin", () => {
    expect(
      isAllowedOrigin(
        request({ origin: canonicalOrigin(), "content-type": "application/json" })
      )
    ).toBe(true);
  });

  it("rejects another site", () => {
    expect(
      isAllowedOrigin(
        request({
          origin: "https://attacker.example",
          "content-type": "application/json",
        })
      )
    ).toBe(false);
  });

  it("accepts a request without an origin header", () => {

    expect(
      isAllowedOrigin(request({ "content-type": "application/json" }))
    ).toBe(true);
  });

  it("lists the deployment's own origins", () => {
    expect(allowedOrigins()).toContain(canonicalOrigin());
  });

  it("accepts a request addressed to the same host", () => {

    const request = new Request("https://regexlab.indevs.in/auth/callback", {
      method: "POST",
      headers: new Headers({
        origin: "https://regexlab.indevs.in",
        host: "regexlab.indevs.in",
      }),
    });

    expect(isAllowedOrigin(request)).toBe(true);
  });

  it("rejects another origin even when the request names our host", () => {
    const request = new Request("https://regexlab.indevs.in/auth/callback", {
      method: "POST",
      headers: new Headers({
        origin: "https://attacker.example",
        host: "regexlab.indevs.in",
      }),
    });

    expect(isAllowedOrigin(request)).toBe(false);
  });
});

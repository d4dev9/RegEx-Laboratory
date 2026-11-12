import { describe, expect, it } from "vitest";

import { clientIp, rateLimitBucket } from "./rate-limit";

function headers(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe("clientIp", () => {
  it("prefers the header the platform writes for itself", () => {

    const ip = clientIp({
      headers: headers({
        "x-vercel-forwarded-for": "203.0.113.10",
        "x-real-ip": "203.0.113.7",
        "x-forwarded-for": "198.51.100.1",
      }),
    });
    expect(ip).toBe("203.0.113.10");
  });

  it("prefers x-real-ip, which the edge sets and a client cannot forge", () => {
    const ip = clientIp({
      headers: headers({
        "x-real-ip": "203.0.113.7",
        "x-forwarded-for": "198.51.100.1",
      }),
    });
    expect(ip).toBe("203.0.113.7");
  });

  it("ignores a header no edge of this deployment writes", () => {

    const ip = clientIp({
      headers: headers({
        "cf-connecting-ip": "203.0.113.8",
        "x-forwarded-for": "198.51.100.1",
      }),
    });
    expect(ip).toBe("198.51.100.1");
  });

  it("reads the right-most x-forwarded-for entry, not the client-supplied one", () => {

    const ip = clientIp({
      headers: headers({
        "x-forwarded-for": "1.2.3.4, 5.6.7.8, 203.0.113.9",
      }),
    });
    expect(ip).toBe("203.0.113.9");
  });

  it("collapses a request with no forwarding headers into one bucket", () => {
    expect(clientIp({ headers: headers({}) })).toBe("unknown");
  });
});

describe("rateLimitBucket", () => {

  it("gives the expensive endpoint a bucket of its own", () => {
    expect(rateLimitBucket("/api/explain")).not.toBe(
      rateLimitBucket("/api/patterns")
    );
  });

  it("keeps the rest of the API in one bucket", () => {
    expect(rateLimitBucket("/api/patterns")).toBe(
      rateLimitBucket("/api/public/patterns/abc")
    );
  });

  it("groups the pages by their section", () => {
    expect(rateLimitBucket("/lab")).toBe("lab");
    expect(rateLimitBucket("/p/abc")).toBe("p");
    expect(rateLimitBucket("/")).toBe("root");
  });
});

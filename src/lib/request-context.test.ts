import { describe, expect, it } from "vitest";
import {
  getClientIpFromHeaders,
  normalizeEmailAddress,
} from "@/lib/request-context";

describe("request-context", () => {
  it("normalise les emails", () => {
    expect(normalizeEmailAddress("  Test@Example.com ")).toBe("test@example.com");
  });

  it("prend la première IP du x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    });

    expect(getClientIpFromHeaders(headers)).toBe("203.0.113.10");
  });

  it("retombe sur unknown sans en-têtes réseau", () => {
    expect(getClientIpFromHeaders(new Headers())).toBe("unknown");
  });
});

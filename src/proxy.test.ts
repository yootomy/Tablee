import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("proxy", () => {
  it("laisse passer le manifest public", () => {
    const request = new NextRequest("https://example.test/manifest.webmanifest");
    const response = proxy(request);

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirige vers login pour une route protégée sans cookie de session", () => {
    const request = new NextRequest("https://example.test/dashboard");
    const response = proxy(request);

    expect(response.headers.get("location")).toBe(
      "https://example.test/login?callbackUrl=%2Fdashboard",
    );
  });

  it("redirige les anciennes routes /tablee vers la racine", () => {
    const request = new NextRequest("https://example.test/tablee/dashboard?tab=week");
    const response = proxy(request);

    expect(response.headers.get("location")).toBe("https://example.test/dashboard?tab=week");
  });
});

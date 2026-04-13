import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("proxy", () => {
  it("laisse passer le manifest public", () => {
    const request = new NextRequest("https://example.test/tablee/manifest.webmanifest");
    const response = proxy(request);

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirige vers login pour une route protégée sans cookie de session", () => {
    const request = new NextRequest("https://example.test/tablee/dashboard");
    const response = proxy(request);

    expect(response.headers.get("location")).toBe(
      "https://example.test/tablee/login?callbackUrl=%2Ftablee%2Fdashboard",
    );
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import { resolveActiveFamilyId } from "@/lib/auth-utils";

describe("resolveActiveFamilyId", () => {
  const memberships = [
    { family_id: "family-a", role: "member" },
    { family_id: "family-b", role: "admin" },
  ];

  it("garde la famille préférée si elle est encore valide", () => {
    expect(resolveActiveFamilyId(memberships, "family-b")).toBe("family-b");
  });

  it("retombe sur la première famille quand la préférence manque", () => {
    expect(resolveActiveFamilyId(memberships, null)).toBe("family-a");
  });

  it("retombe sur la première famille quand la préférence est obsolète", () => {
    expect(resolveActiveFamilyId(memberships, "missing")).toBe("family-a");
  });
});

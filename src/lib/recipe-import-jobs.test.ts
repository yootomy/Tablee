import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockCount,
  mockFindFirst,
  mockCreate,
  mockUpdateMany,
  mockResolveFamilyEntitlements,
  mockCountProfileImportsInRolling24Hours,
} = vi.hoisted(() => ({
  mockCount: vi.fn(),
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockResolveFamilyEntitlements: vi.fn(),
  mockCountProfileImportsInRolling24Hours: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    recipe_import_jobs: {
      count: mockCount,
      findFirst: mockFindFirst,
      create: mockCreate,
      updateMany: mockUpdateMany,
    },
  },
}));

vi.mock("@/lib/app-schema", () => ({
  ensureOperationalSchema: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/family-billing", () => ({
  resolveFamilyEntitlements: mockResolveFamilyEntitlements,
  countProfileImportsInRolling24Hours: mockCountProfileImportsInRolling24Hours,
}));

vi.mock("@/lib/rate-limit", () => ({
  RateLimitExceededError: class RateLimitExceededError extends Error {
    constructor(
      message: string,
      public readonly retryAfterSeconds: number,
    ) {
      super(message);
    }
  },
}));

import { createRecipeImportJob } from "@/lib/recipe-import-jobs";

describe("recipe-import-jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockResolveFamilyEntitlements.mockResolvedValue({
      plan: "free",
      aiLimits: {
        familyRolling30Day: 5,
        familyRolling24h: null,
        hiddenProfileRolling24h: 15,
      },
      aiUsage: {
        familyRolling30DayUsed: 0,
        familyRolling30DayRemaining: 5,
        familyRolling24hUsed: 0,
        familyRolling24hRemaining: null,
      },
    });
    mockCountProfileImportsInRolling24Hours.mockResolvedValue(0);
  });

  it("réutilise une recette récente déjà importée", async () => {
    mockCount.mockResolvedValue(0);
    mockFindFirst.mockResolvedValue({
      status: "completed",
      recipe_id: "recipe-123",
    });

    const result = await createRecipeImportJob({
      familyId: "family-1",
      profileId: "profile-1",
      provider: "gemini",
      sourceUrl: "https://www.tiktok.com/@foo/video/123?t=999",
    });

    expect(result.reusedRecipeId).toBe("recipe-123");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("bloque si un import est déjà en cours pour la famille", async () => {
    mockCount.mockResolvedValue(1);
    mockFindFirst.mockResolvedValue(null);

    await expect(
      createRecipeImportJob({
        familyId: "family-1",
        profileId: "profile-1",
        provider: "gemini",
        sourceUrl: "https://www.instagram.com/reel/abc/?utm_source=test",
      }),
    ).rejects.toThrow(/déjà en cours/i);
  });

  it("crée un job avec une URL normalisée", async () => {
    mockCount.mockResolvedValue(0);
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "job-1" });

    await createRecipeImportJob({
      familyId: "family-1",
      profileId: "profile-1",
      provider: "gemini",
      sourceUrl: "https://www.tiktok.com/@foo/video/123?t=999#section",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source_url: "https://www.tiktok.com/@foo/video/123",
          status: "processing",
        }),
      }),
    );
  });

  it("bloque quand le quota gratuit sur 30 jours est atteint", async () => {
    mockCount.mockResolvedValue(0);
    mockFindFirst.mockResolvedValue(null);
    mockResolveFamilyEntitlements.mockResolvedValue({
      plan: "free",
      aiLimits: {
        familyRolling30Day: 5,
        familyRolling24h: null,
        hiddenProfileRolling24h: 15,
      },
      aiUsage: {
        familyRolling30DayUsed: 5,
        familyRolling30DayRemaining: 0,
        familyRolling24hUsed: 0,
        familyRolling24hRemaining: null,
      },
    });

    await expect(
      createRecipeImportJob({
        familyId: "family-1",
        profileId: "profile-1",
        provider: "gemini",
        sourceUrl: "https://www.tiktok.com/@foo/video/123",
      }),
    ).rejects.toThrow(/premium/i);
  });
});

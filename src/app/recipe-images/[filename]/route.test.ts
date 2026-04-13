import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireActiveFamily,
  mockFindRecipe,
  mockFindRecipeMediaFile,
  mockReadFile,
} = vi.hoisted(() => ({
  mockRequireActiveFamily: vi.fn(),
  mockFindRecipe: vi.fn(),
  mockFindRecipeMediaFile: vi.fn(),
  mockReadFile: vi.fn(),
}));

vi.mock("@/lib/auth-utils", () => ({
  requireActiveFamily: mockRequireActiveFamily,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    recipes: {
      findFirst: mockFindRecipe,
    },
  },
}));

vi.mock("@/lib/recipe-media-files", () => ({
  findRecipeMediaFile: mockFindRecipeMediaFile,
}));

vi.mock("@/lib/recipe-media-storage", () => ({
  getRecipeMediaFilename: (value: string) => value,
  RECIPE_MEDIA_ROUTE_PREFIX: "/recipe-images",
}));

vi.mock("node:fs", () => ({
  promises: {
    readFile: mockReadFile,
  },
}));

import { GET } from "./route";

describe("recipe image route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse les utilisateurs sans famille active", async () => {
    mockRequireActiveFamily.mockRejectedValue(new Error("Unauthorized"));

    const response = await GET(new Request("https://example.test"), {
      params: Promise.resolve({ filename: "image.jpg" }),
    });

    expect(response.status).toBe(401);
  });

  it("retourne 404 si l'image n'appartient pas à la famille active", async () => {
    mockRequireActiveFamily.mockResolvedValue({ familyId: "family-1" });
    mockFindRecipe.mockResolvedValue(null);

    const response = await GET(new Request("https://example.test"), {
      params: Promise.resolve({ filename: "image.jpg" }),
    });

    expect(response.status).toBe(404);
  });

  it("sert l'image avec un cache privé quand la recette appartient à la famille", async () => {
    mockRequireActiveFamily.mockResolvedValue({ familyId: "family-1" });
    mockFindRecipe.mockResolvedValue({ id: "recipe-1" });
    mockFindRecipeMediaFile.mockResolvedValue("C:/tmp/image.jpg");
    mockReadFile.mockResolvedValue(Buffer.from("image"));

    const response = await GET(new Request("https://example.test"), {
      params: Promise.resolve({ filename: "image.jpg" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});

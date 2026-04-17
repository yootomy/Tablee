import { describe, expect, it } from "vitest";

import {
  extractTikTokPhotoPayloadFromEmbedHtml,
  extractTikTokVideoPayloadFromOEmbed,
} from "@/lib/recipe-import";

describe("recipe-import", () => {
  it("parse un embed TikTok photo en métadonnées et galerie", () => {
    const html = `
      <html>
        <body>
          <script id="__FRONTITY_CONNECT_STATE__" type="application/json">${JSON.stringify({
            source: {
              data: {
                "/embed/7492832129290652950": {
                  videoData: {
                    itemInfos: {
                      text: "Poulet frit coréen maison avec sauce sucrée pimentée #recette #poulet",
                      covers: ["https://cdn.example/cover-1.jpg"],
                      coversOrigin: ["https://cdn.example/cover-origin.jpg"],
                    },
                    authorInfos: {
                      uniqueId: "_nzcook",
                      nickName: "_nzcook",
                    },
                    textExtra: [{ hashtagName: "recette" }, { hashtagName: "poulet" }],
                    imagePostInfo: {
                      displayImages: [
                        { urlList: ["https://cdn.example/slide-1.jpg"] },
                        { urlList: ["https://cdn.example/slide-2.jpg"] },
                      ],
                    },
                  },
                },
              },
            },
          })}</script>
        </body>
      </html>
    `;

    const payload = extractTikTokPhotoPayloadFromEmbedHtml(
      html,
      "https://www.tiktok.com/@_nzcook/photo/7492832129290652950",
    );

    expect(payload.metadata.platform).toBe("tiktok");
    expect(payload.metadata.creatorName).toBe("_nzcook");
    expect(payload.metadata.webpageUrl).toBe(
      "https://www.tiktok.com/@_nzcook/photo/7492832129290652950",
    );
    expect(payload.metadata.thumbnailUrl).toBe(
      "https://cdn.example/cover-origin.jpg",
    );
    expect(payload.metadata.tags).toEqual(["recette", "poulet"]);
    expect(payload.imageUrls).toEqual([
      "https://cdn.example/slide-1.jpg",
      "https://cdn.example/slide-2.jpg",
    ]);
  });

  it("convertit un oEmbed TikTok vidéo en fallback exploitable", () => {
    const payload = extractTikTokVideoPayloadFromOEmbed(
      {
        title:
          "High Protein Creamy Garlic Beef Pasta! 477 Calories par portion #pasta #mealprep #highprotein",
        author_name: "Jalalsamfit",
        author_unique_id: "jalalsamfit",
        thumbnail_url: "https://cdn.example/tiktok-cover.jpg",
      },
      "https://www.tiktok.com/@jalalsamfit/video/7231243748905159962",
    );

    expect(payload.metadata.platform).toBe("tiktok");
    expect(payload.metadata.creatorName).toBe("jalalsamfit");
    expect(payload.metadata.webpageUrl).toBe(
      "https://www.tiktok.com/@jalalsamfit/video/7231243748905159962",
    );
    expect(payload.metadata.thumbnailUrl).toBe(
      "https://cdn.example/tiktok-cover.jpg",
    );
    expect(payload.metadata.description).toContain(
      "High Protein Creamy Garlic Beef Pasta!",
    );
    expect(payload.metadata.tags).toEqual([
      "pasta",
      "mealprep",
      "highprotein",
    ]);
    expect(payload.imageUrls).toEqual(["https://cdn.example/tiktok-cover.jpg"]);
  });
});

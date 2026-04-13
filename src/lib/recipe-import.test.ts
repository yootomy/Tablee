import { describe, expect, it } from "vitest";

import { extractTikTokPhotoPayloadFromEmbedHtml } from "@/lib/recipe-import";

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
});

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const basePath = "/tablee";
  const scope = `${basePath}/`;

  return {
    name: "Tablee",
    short_name: "Tablee",
    description: "Organisez vos repas, recettes et courses en famille",
    id: basePath,
    start_url: `${basePath}/dashboard`,
    scope,
    display: "standalone",
    background_color: "#fafaf8",
    theme_color: "#00704A",
    icons: [
      {
        src: `${basePath}/logo-tablee-nobg.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${basePath}/logo-tablee-nobg.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

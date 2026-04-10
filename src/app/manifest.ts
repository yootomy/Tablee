import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tablee",
    short_name: "Tablee",
    description: "Organisez vos repas, recettes et courses en famille",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fafaf8",
    theme_color: "#00704A",
    icons: [
      {
        src: "/logo-tablee-nobg.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

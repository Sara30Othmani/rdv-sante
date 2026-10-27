import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "RDV Santé",
    short_name: "RDV Santé",
    description: "Application de gestion des rendez-vous médicaux",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#087f8c",
    lang: "fr",
    icons: [
      { src: "/med.png", sizes: "192x192", type: "image/png" },
      { src: "/med.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

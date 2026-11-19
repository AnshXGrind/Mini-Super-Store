import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mini Super Store",
    short_name: "Mini Store",
    description: "Everyday essentials in Ladwa.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f5",
    theme_color: "#1f5139",
    lang: "en-IN",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}

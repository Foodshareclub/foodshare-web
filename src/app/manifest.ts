import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FoodShare - Share Food, Reduce Waste",
    short_name: "FoodShare",
    description:
      "Community food sharing platform to reduce food waste and help those in need. Find free food, share surplus, and connect with neighbors.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#10b981",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/logo192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/logo512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["food", "social", "lifestyle", "utilities"],
    screenshots: [
      {
        src: "/screenshot-mobile.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
      },
      {
        src: "/screenshot-desktop.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
      },
    ],
    shortcuts: [
      {
        name: "Browse Food",
        short_name: "Food",
        description: "Browse available food listings",
        url: "/food?type=food",
        icons: [
          {
            src: "/icon-food-96x96.png",
            sizes: "96x96",
          },
        ],
      },
      {
        name: "Map View",
        short_name: "Map",
        description: "View food locations on map",
        url: "/map/food",
        icons: [
          {
            src: "/icon-map-96x96.png",
            sizes: "96x96",
          },
        ],
      },
    ],
  };
}

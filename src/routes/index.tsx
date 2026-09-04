import { createFileRoute } from "@tanstack/react-router";
import { GameCanvas } from "@/components/game/GameCanvas";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pulau Pancing — Game Memancing 3D" },
      {
        name: "description",
        content:
          "Game memancing 3D: lempar joran dari dermaga pulau kecil di tengah laut luas, tunggu sambaran, lalu tarik ikan yang meronta.",
      },
      { property: "og:title", content: "Pulau Pancing — Game Memancing 3D" },
      {
        property: "og:description",
        content:
          "Lempar kail, rasakan sambaran ikan, dan angkat tangkapanmu di laut luas bergaya blok.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GameCanvas,
});

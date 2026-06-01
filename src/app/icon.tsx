import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  const hebrewFont = await fetch(
    "https://cdn.jsdelivr.net/fontsource/fonts/noto-serif-hebrew@latest/hebrew-500-normal.ttf"
  ).then((r) => r.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          background: "#1c1917",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fafaf9",
          fontFamily: "Noto Serif Hebrew",
          fontSize: 48,
          lineHeight: 1,
          fontWeight: 500,
          borderRadius: 12,
        }}
      >
        א
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Noto Serif Hebrew",
          data: hebrewFont,
          style: "normal",
          weight: 500,
        },
      ],
    }
  );
}

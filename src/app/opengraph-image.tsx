import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "German Metrical Psalter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
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
          gap: 80,
          color: "#fafaf9",
          fontFamily: "Noto Serif Hebrew, serif",
        }}
      >
        <div
          style={{
            fontSize: 380,
            lineHeight: 1,
            fontWeight: 500,
            color: "#fafaf9",
          }}
        >
          א
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            maxWidth: 600,
          }}
        >
          <div style={{ fontSize: 72, lineHeight: 1.05, fontWeight: 500 }}>
            German Metrical Psalter
          </div>
          <div style={{ fontSize: 32, color: "#a8a29e", lineHeight: 1.3 }}>
            Hebrew Psalms rendered into singable modern German metrical verse
          </div>
        </div>
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

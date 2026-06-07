import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#3b82f6",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "sans-serif",
          fontWeight: 700,
          fontSize: 20,
        }}
      >
        M
      </div>
    ),
    { ...size }
  );
}

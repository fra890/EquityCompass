import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { pop, prog, easeOut } from "../anim";
import { ART_H, ART_W, C, FONT_BODY, FONT_HEAD } from "../theme";
import { ArtDefs } from "./Paper";

/** Layout numbers shared by scenes and captions for both formats. */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const tall = height > 1200;
  const captionZone = tall ? 310 : 244; // reserved lower third
  const headTop = tall ? 64 : 40;
  const headH = tall ? 200 : 150;
  const artAreaH = height - headTop - headH - captionZone;
  const scale = Math.min((width - 60) / ART_W, artAreaH / ART_H);
  return { width, height, tall, captionZone, headTop, headH, artAreaH, scale };
};

/**
 * Scene frame: kicker + headline on top, a 1000x720 SVG art box scaled to
 * fit, and the lower third left free for captions.
 */
export const Stage: React.FC<{
  kicker?: string;
  title: React.ReactNode;
  children: React.ReactNode;
}> = ({ kicker, title, children }) => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const tIn = pop(frame, 0.05);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: L.headTop,
          left: 60,
          right: 60,
          height: L.headH,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          opacity: prog(frame, 0, 0.3, easeOut),
          transform: `translateY(${(1 - tIn) * 18}px)`,
        }}
      >
        {kicker ? (
          <div
            style={{
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: L.tall ? 25 : 22,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.navy,
              marginBottom: 10,
            }}
          >
            {kicker}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontWeight: 800,
            fontSize: L.tall ? 70 : 58,
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            color: C.ink,
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: L.headTop + L.headH,
          left: 0,
          width: L.width,
          height: L.artAreaH,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={ART_W * L.scale}
          height={ART_H * L.scale}
          viewBox={`0 0 ${ART_W} ${ART_H}`}
          style={{ overflow: "visible" }}
        >
          <ArtDefs />
          {children}
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/** SVG text shorthand. */
export const T: React.FC<
  {
    x: number;
    y: number;
    size?: number;
    weight?: number;
    fill?: string;
    anchor?: "start" | "middle" | "end";
    head?: boolean;
    opacity?: number;
    children: React.ReactNode;
  } & React.SVGProps<SVGTextElement>
> = ({ x, y, size = 30, weight = 600, fill = C.ink, anchor = "start", head, opacity, children, ...rest }) => (
  <text
    x={x}
    y={y}
    fontSize={size}
    fontWeight={weight}
    fill={fill}
    textAnchor={anchor}
    opacity={opacity}
    fontFamily={head ? FONT_HEAD : FONT_BODY}
    letterSpacing={head ? "-0.01em" : undefined}
    {...rest}
  >
    {children}
  </text>
);

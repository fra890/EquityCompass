import React from "react";
import { useCurrentFrame } from "remotion";
import { prog, easeOut } from "../anim";
import { CAPTIONS_HIDDEN } from "../script";
import { C, FONT_BODY } from "../theme";
import { FPS, LINES, type SceneId } from "../timeline";
import { useLayout } from "./Stage";

const renderMarked = (text: string) =>
  text.split(/(\[\[.*?\]\])/g).map((part, i) =>
    part.startsWith("[[") ? (
      <span key={i} style={{ color: C.highlight }}>
        {part.slice(2, -2)}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );

/** Burned-in caption for the current narration line, in the lower third. */
export const Captions: React.FC<{ scene: SceneId }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const L = useLayout();
  if (CAPTIONS_HIDDEN[scene]) return null;
  const t = frame / FPS;
  const line = LINES[scene].find((l) => !l.hero && t >= l.at && t < l.to);
  if (!line) return null;
  const pIn = prog(frame, line.at, line.at + 0.22, easeOut);
  const pOut = 1 - prog(frame, line.to - 0.12, line.to, easeOut);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: L.tall ? 56 : 40,
        height: L.captionZone - (L.tall ? 76 : 56),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 44px",
      }}
    >
      <div
        style={{
          backgroundColor: C.ink,
          color: C.paper,
          fontFamily: FONT_BODY,
          fontWeight: 600,
          fontSize: L.tall ? 45 : 40,
          lineHeight: 1.22,
          textAlign: "center",
          padding: L.tall ? "22px 34px 24px" : "18px 30px 20px",
          maxWidth: 992,
          textWrap: "balance" as never,
          opacity: Math.min(pIn, pOut),
          transform: `translateY(${(1 - pIn) * 14}px) rotate(-0.5deg)`,
          boxShadow: "4px 6px 0 rgba(58,47,28,0.22)",
          clipPath: "polygon(0.6% 3%, 99.6% 0%, 100% 97%, 0% 100%)",
        }}
      >
        {renderMarked(line.text)}
      </div>
    </div>
  );
};

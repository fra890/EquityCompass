import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { prog, easeOut } from "../anim";
import { useLayout } from "../components/Stage";
import { C, FONT_BODY } from "../theme";

export const Disclosure: React.FC<{ text: string; firmLine?: string }> = ({ text, firmLine }) => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const p = prog(frame, 0, 0.35, easeOut);
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 84px", opacity: p }}>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: C.navy,
          marginBottom: 30,
        }}
      >
        Disclosure
      </div>
      <div style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: L.tall ? 46 : 42, lineHeight: 1.34, color: C.ink }}>
        {text}
      </div>
      {firmLine ? (
        <div
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 500,
            fontSize: L.tall ? 31 : 29,
            lineHeight: 1.38,
            color: C.inkSoft,
            marginTop: L.tall ? 44 : 30,
            paddingTop: L.tall ? 36 : 26,
            borderTop: `3px solid ${C.ink}`,
          }}
        >
          {firmLine}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

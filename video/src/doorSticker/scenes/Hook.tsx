import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { pop, prog } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { useLayout } from "../../components/Stage";
import { C, FONT_BODY, FONT_HEAD } from "../../theme";
import { QUOTE_A, QUOTE_B } from "../script";
import { cue } from "../timeline";

const Typed: React.FC<{ text: string; shown: number }> = ({ text, shown }) => (
  <>
    {text.slice(0, shown)}
    <span style={{ opacity: 0 }}>{text.slice(shown)}</span>
  </>
);

/** The client's opening line types out on a paper card. */
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const typeEnd = cue("hook", 1) - 1.1;
  const total = QUOTE_A.length + QUOTE_B.length;
  const n = Math.floor(prog(frame, 0.35, typeEnd, (t) => t) * total);
  const card = pop(frame, 0.05);
  const who = pop(frame, cue("hook", 1) - 0.1);
  return (
    <AbsoluteFill style={{ padding: `${L.tall ? 110 : 60}px 60px ${L.captionZone + 10}px`, justifyContent: "center" }}>
      <div
        style={{
          background: C.white,
          padding: L.tall ? "64px 60px 60px" : "44px 54px 44px",
          boxShadow: "6px 9px 0 rgba(58,47,28,0.2)",
          transform: `rotate(-1.2deg) scale(${0.94 + 0.06 * card})`,
          opacity: Math.min(1, card * 1.6),
        }}
      >
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 150, lineHeight: 0.6, color: C.highlight, height: 60 }}>
          &ldquo;
        </div>
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontWeight: 700,
            fontSize: L.tall ? 68 : 56,
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            color: C.ink,
          }}
        >
          <Typed text={QUOTE_A} shown={Math.min(n, QUOTE_A.length)} />{" "}
          <span style={{ color: C.navy, fontWeight: 800 }}>
            <Highlight at={typeEnd + 0.15} dur={0.6}>
              <Typed text={QUOTE_B} shown={Math.max(0, n - QUOTE_A.length)} />
            </Highlight>
          </span>
        </div>
      </div>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 700,
          fontSize: L.tall ? 27 : 24,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: C.navy,
          marginTop: L.tall ? 44 : 28,
          marginLeft: 8,
          opacity: who,
        }}
      >
        A client, first five minutes
      </div>
    </AbsoluteFill>
  );
};

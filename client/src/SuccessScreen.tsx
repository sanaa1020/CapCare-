import { useEffect, useRef, useState } from "react";

// Phase sequence:
//   init     → mushroom fully visible, happy face
//   retract  → stem scaleY → 0 (retracts up into cap, 640ms)
//   morph    → cap fades out, circle fades in (400ms overlap)
//   draw     → checkmark stroke-dashoffset 86 → 0 (620ms)
//   hold     → "You're all set!" appears, pause
type SPhase = "init" | "retract" | "morph" | "draw" | "hold";

interface Props { onComplete: () => void; }

export default function SuccessScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState<SPhase>("init");
  const cbRef = useRef(onComplete);
  useEffect(() => { cbRef.current = onComplete; });

  useEffect(() => {
    const ts = [
      setTimeout(() => setPhase("retract"),  120),
      setTimeout(() => setPhase("morph"),    760),
      setTimeout(() => setPhase("draw"),    1060),
      setTimeout(() => setPhase("hold"),    1720),
      setTimeout(() => cbRef.current(),     2550),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  const stemGone     = phase !== "init";
  const capGone      = stemGone && phase !== "retract";
  const circleIn     = capGone;
  const checkDrawn   = phase === "draw" || phase === "hold";
  const labelIn      = phase === "hold";

  return (
    <div
      className="size-full flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(160deg,#fff8f5 0%,#fde8e0 55%,#f8d8cc 100%)",
        fontFamily: "'Fredoka One', cursive",
      }}
    >
      <svg
        viewBox="0 0 160 170"
        width="240" height="240"
        style={{ overflow: "visible" }}
      >
        {/* STEM + FACE: retracts by scaling Y to 0 from the top (toward cap) */}
        <g style={{
          transformBox: "fill-box",
          transformOrigin: "50% 0%",
          transform: stemGone ? "scaleY(0)" : "scaleY(1)",
          transition: "transform 0.64s cubic-bezier(0.45,0,0.55,1)",
        }}>
          {/* Stem */}
          <path
            d="M58 112 C56 132 53 150 53 160 Q53 167 80 167 Q107 167 107 160 C107 150 104 132 102 112 Z"
            fill="#f2e8d6" stroke="#c9aa7c" strokeWidth="2.5"/>
          {/* Gill */}
          <path d="M48 112 Q80 122 112 112" fill="none" stroke="#c9aa7c" strokeWidth="2" strokeLinecap="round"/>
          {/* Cheeks */}
          <ellipse cx="63" cy="146" rx="8"   ry="5.5" fill="#f4a0a0" opacity="0.45"/>
          <ellipse cx="97" cy="146" rx="8"   ry="5.5" fill="#f4a0a0" opacity="0.45"/>
          {/* Happy squint eyes */}
          <path d="M61 139 Q67 133 73 139" stroke="#2a1a0a" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
          <path d="M87 139 Q93 133 99 139" stroke="#2a1a0a" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
          {/* Wide smile */}
          <path d="M65 151 Q80 164 95 151" stroke="#2a1a0a" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        </g>

        {/* CAP: fades out as circle fades in */}
        <g style={{ opacity: capGone ? 0 : 1, transition: "opacity 0.40s ease" }}>
          <path
            d="M26 106 Q24 72 50 52 Q63 42 80 40 Q97 42 110 52 Q136 72 134 106 Q107 116 80 117 Q53 116 26 106Z"
            fill="#c0392b" stroke="#8b1a1a" strokeWidth="2.5"/>
          {/* Specular highlight */}
          <path d="M52 56 Q67 46 90 48 Q108 52 118 66"
            stroke="rgba(255,255,255,0.28)" strokeWidth="7" fill="none" strokeLinecap="round"/>
          {/* Polka dots */}
          <ellipse cx="80"  cy="64" rx="12.5" ry="11.5" fill="white" opacity="0.93"/>
          <ellipse cx="53"  cy="79" rx="8.5"  ry="8"    fill="white" opacity="0.88"/>
          <ellipse cx="108" cy="77" rx="8.5"  ry="8"    fill="white" opacity="0.88"/>
          <ellipse cx="66"  cy="97" rx="6.5"  ry="6"    fill="white" opacity="0.82"/>
          <ellipse cx="96"  cy="95" rx="6"    ry="5.5"  fill="white" opacity="0.82"/>
        </g>

        {/* CIRCLE: fades in, same red, positioned over cap area */}
        <circle
          cx="80" cy="73" r="47"
          fill="#c0392b"
          style={{ opacity: circleIn ? 1 : 0, transition: "opacity 0.40s ease" }}
        />

        {/* CHECKMARK: draws on, then glows */}
        {/* Glow ring behind the check */}
        <circle
          cx="80" cy="73" r="47"
          fill="none"
          stroke="rgba(192,57,43,0.40)"
          strokeWidth="14"
          style={{
            opacity: checkDrawn ? 1 : 0,
            transform: checkDrawn ? "scale(1.06)" : "scale(0.88)",
            transformBox: "fill-box", transformOrigin: "center",
            transition: checkDrawn
              ? "opacity 0.50s ease 0.55s, transform 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.55s"
              : "none",
            filter: "blur(6px)",
          }}
        />
        {/* Outer pulse ring */}
        <circle
          cx="80" cy="73" r="47"
          fill="none"
          stroke="rgba(192,57,43,0.22)"
          strokeWidth="6"
          style={{
            opacity: labelIn ? 1 : 0,
            transform: labelIn ? "scale(1.22)" : "scale(1.0)",
            transformBox: "fill-box", transformOrigin: "center",
            transition: "opacity 0.60s ease, transform 0.80s cubic-bezier(0.22,1,0.36,1)",
            filter: "blur(2px)",
          }}
        />
        <path
          d="M52 74 L68 92 L112 50"
          fill="none"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: "88",
            strokeDashoffset: checkDrawn ? "0" : "88",
            filter: checkDrawn ? "drop-shadow(0 0 6px rgba(255,255,255,0.80))" : "none",
            transition: checkDrawn
              ? "stroke-dashoffset 0.58s cubic-bezier(0.16,1,0.3,1), filter 0.40s ease 0.50s"
              : "none",
          }}
        />
      </svg>

      {/* Label fades in during hold */}
      <div style={{
        fontFamily: "'Fredoka One', cursive",
        fontSize: "1.65rem",
        color: "#c0392b",
        marginTop: 18,
        letterSpacing: "0.01em",
        opacity: labelIn ? 1 : 0,
        transform: labelIn ? "translateY(0) scale(1)" : "translateY(12px) scale(0.92)",
        transition: "opacity 0.42s cubic-bezier(0.34,1.56,0.64,1), transform 0.52s cubic-bezier(0.34,1.56,0.64,1)",
        textShadow: "0 2px 16px rgba(192,57,43,0.28)",
      }}>
        You&#39;re all set!
      </div>
    </div>
  );
}

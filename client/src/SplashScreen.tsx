import { useEffect, useRef } from "react";

// Splash animation: ZERO React state changes during the sequence.
// All visual changes are driven by:
//   • CSS keyframe animations (cream overlay, cap, letters, hop, sparkles)
//   • Direct SVG ref mutations via setTimeout (face changes: wink, happy eyes)
// This means React renders this component ONCE and never re-renders,
// eliminating all main-thread jank that was competing with the GPU animations.

const WORD        = ["C", "a", "p", "C", "a", "r", "e"] as const;
const LEFT_C      = 0;
const RIGHT_C     = 3;
const INNER_ORDER = [1, 2, 4, 5, 6];

interface Props {
  onComplete: () => void;
  // When true, skips straight to the final resting frame of the animation
  // (happy face, full wordmark, cap already landed) instead of playing the
  // ~5.6s build-up sequence. Used for the brief "reopen" loading screen so it
  // doesn't replay the whole multi-stage entrance every time.
  quick?: boolean;
}

export default function SplashScreen({ onComplete, quick = false }: Props) {
  const normLeftEyeRef  = useRef<SVGGElement>(null);
  const normRightEyeRef = useRef<SVGGElement>(null);
  const winkEyeRef      = useRef<SVGPathElement>(null);
  const happyEyesRef    = useRef<SVGGElement>(null);
  const normSmileRef    = useRef<SVGPathElement>(null);
  const wideSmileRef    = useRef<SVGPathElement>(null);
  const onCompleteRef   = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  useEffect(() => {
    if (quick) {
      const t = setTimeout(() => onCompleteRef.current(), 900);
      return () => clearTimeout(t);
    }

    const ts: ReturnType<typeof setTimeout>[] = [];

    // Wink at 2380ms: direct DOM mutation, no React re-render
    ts.push(setTimeout(() => {
      if (normRightEyeRef.current) normRightEyeRef.current.style.opacity = "0";
      if (winkEyeRef.current) winkEyeRef.current.style.opacity = "1";
      ts.push(setTimeout(() => {
        if (normRightEyeRef.current) normRightEyeRef.current.style.opacity = "1";
        if (winkEyeRef.current) winkEyeRef.current.style.opacity = "0";
      }, 260));
    }, 2380));

    // Happy face + wide smile at 4800ms
    ts.push(setTimeout(() => {
      if (normLeftEyeRef.current)  normLeftEyeRef.current.style.opacity  = "0";
      if (normRightEyeRef.current) normRightEyeRef.current.style.opacity = "0";
      if (happyEyesRef.current)    happyEyesRef.current.style.opacity    = "1";
      if (normSmileRef.current)    normSmileRef.current.style.opacity    = "0";
      if (wideSmileRef.current)    wideSmileRef.current.style.opacity    = "1";
    }, 4800));

    ts.push(setTimeout(() => onCompleteRef.current(), 5600));
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quick]);

  return (
    <div
      className="size-full flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#c0392b", fontFamily: "'Fredoka One', cursive", position: "relative" }}
    >
      {/* Cream overlay: GPU-composited opacity animation, no React state */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundColor: "rgba(255,252,248,0.95)",
        opacity: quick ? 1 : 0,
        ...(quick ? {} : { animation: "splashCreamIn 0.65s ease 1000ms forwards" }),
        willChange: "opacity",
      }}/>

      <div className="flex flex-col items-center" style={{ gap: 0, position: "relative", zIndex: 1 }}>
        {/* SVG mushroom: hop triggered by CSS animation at 4800ms, no React state */}
        <svg
          viewBox="0 0 160 170"
          width="220" height="220"
          style={{
            overflow: "visible",
            ...(quick ? {} : { animation: "joyHop 0.8s ease-out 4800ms forwards" }),
            willChange: "transform",
          }}
        >
          {/* Body & stem */}
          <g>
            <path d="M58 112 C56 132 53 150 53 160 Q53 167 80 167 Q107 167 107 160 C107 150 104 132 102 112 Z"
              fill="#f2e8d6" stroke="#c9aa7c" strokeWidth="2.5"/>
            <path d="M48 112 Q80 122 112 112" fill="none" stroke="#c9aa7c" strokeWidth="2" strokeLinecap="round"/>
            {/* Cheeks: always visible */}
            <ellipse cx="63" cy="146" rx="8" ry="5.5" fill="#f4a0a0" opacity="0.45"/>
            <ellipse cx="97" cy="146" rx="8" ry="5.5" fill="#f4a0a0" opacity="0.45"/>

            {/* Normal left eye: ref-controlled, starts visible (hidden immediately in quick mode) */}
            <g ref={normLeftEyeRef} style={quick ? { opacity: 0 } : undefined}>
              <ellipse cx="67" cy="140" rx="5.5" ry="6" fill="#2a1a0a"/>
              <ellipse cx="69" cy="138" rx="1.8" ry="1.8" fill="white"/>
            </g>
            {/* Normal right eye: ref-controlled, starts visible (hidden immediately in quick mode) */}
            <g ref={normRightEyeRef} style={quick ? { opacity: 0 } : undefined}>
              <ellipse cx="93" cy="140" rx="5.5" ry="6" fill="#2a1a0a"/>
              <ellipse cx="95" cy="138" rx="1.8" ry="1.8" fill="white"/>
            </g>
            {/* Wink right eye: starts hidden, ref-shown at 2380ms (skipped entirely in quick mode) */}
            <path ref={winkEyeRef}
              d="M87 140 Q93 135 99 140"
              stroke="#2a1a0a" strokeWidth="2.5" fill="none" strokeLinecap="round"
              style={{ opacity: 0 }}/>

            {/* Happy squint eyes: start hidden, ref-shown at 4800ms (shown immediately in quick mode) */}
            <g ref={happyEyesRef} style={{ opacity: quick ? 1 : 0 }}>
              <path d="M61 139 Q67 133 73 139" stroke="#2a1a0a" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
              <path d="M87 139 Q93 133 99 139" stroke="#2a1a0a" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
            </g>

            {/* Normal small smile: ref-controlled (hidden immediately in quick mode) */}
            <path ref={normSmileRef}
              d="M71 152 Q80 159 89 152"
              stroke="#2a1a0a" strokeWidth="2" fill="none" strokeLinecap="round"
              style={quick ? { opacity: 0 } : undefined}/>
            {/* Wide smile: starts hidden, ref-shown at 4800ms (shown immediately in quick mode) */}
            <path ref={wideSmileRef}
              d="M65 151 Q80 164 95 151"
              stroke="#2a1a0a" strokeWidth="2.2" fill="none" strokeLinecap="round"
              style={{ opacity: quick ? 1 : 0 }}/>
          </g>

          {/* Cap: GPU-composited spin/scale, starts with 200ms delay (already landed in quick mode) */}
          <g style={{
            transformBox: "fill-box", transformOrigin: "center",
            ...(quick ? { transform: "perspective(400px) scale(1) rotateY(0deg)" } : { animation: "capFullSequence 1.8s 200ms forwards" }),
            willChange: "transform, opacity",
          }}>
            <ellipse cx="80" cy="110" rx="46" ry="8" fill="rgba(0,0,0,0.07)"/>
            <path d="M26 106 Q24 72 50 52 Q63 42 80 40 Q97 42 110 52 Q136 72 134 106 Q107 116 80 117 Q53 116 26 106Z"
              fill="#c0392b" stroke="#8b1a1a" strokeWidth="2.5"/>
            <path d="M52 56 Q67 46 90 48 Q108 52 118 66"
              stroke="rgba(255,255,255,0.28)" strokeWidth="7" fill="none" strokeLinecap="round"/>
            <ellipse cx="80"  cy="64" rx="12.5" ry="11.5" fill="white" opacity="0.93"/>
            <ellipse cx="53"  cy="79" rx="8.5"  ry="8"    fill="white" opacity="0.88"/>
            <ellipse cx="108" cy="77" rx="8.5"  ry="8"    fill="white" opacity="0.88"/>
            <ellipse cx="66"  cy="97" rx="6.5"  ry="6"    fill="white" opacity="0.82"/>
            <ellipse cx="96"  cy="95" rx="6"    ry="5.5"  fill="white" opacity="0.82"/>
            <ellipse cx="124" cy="95" rx="4.5"  ry="4"    fill="white" opacity="0.7" />
            <ellipse cx="38"  cy="95" rx="4.5"  ry="4"    fill="white" opacity="0.7" />
          </g>

          {/* Sparkles: CSS opacity animations at 4050ms and 4100ms (already shown in quick mode) */}
          <text x="133" y="64" fontSize="15" fill="#c0392b" opacity={quick ? 1 : 0}
            style={quick ? undefined : { animation: "nodeAppear 0.20s ease 4050ms forwards" }}>✦</text>
          <text x="14"  y="82" fontSize="11" fill="#c0392b" opacity={quick ? 1 : 0}
            style={quick ? undefined : { animation: "nodeAppear 0.20s ease 4100ms forwards" }}>✦</text>
        </svg>

        {/* CapCare wordmark container: CSS reveals at 2950ms (already visible in quick mode) */}
        <div style={{
          position: "relative", display: "flex", alignItems: "flex-end",
          gap: 1, marginTop: -8, height: 60,
          opacity: quick ? 1 : 0,
          ...(quick ? {} : { animation: "splashReveal 0.01s linear 2950ms forwards" }),
        }}>
          {WORD.map((char, i) => {
            const isLeft   = i === LEFT_C;
            const isRight  = i === RIGHT_C;
            const isInner  = !isLeft && !isRight;
            const innerIdx = INNER_ORDER.indexOf(i);
            const innerDelay = 3330 + innerIdx * 80;

            return (
              <span key={i} style={{
                fontFamily: "'Fredoka One', cursive", fontSize: "2.9rem",
                color: "#c0392b", lineHeight: 1, display: "inline-block",
                textShadow: "2px 2px 0 rgba(100,10,10,0.16)",
                // In quick mode every letter is just shown at rest: no slide/pop animation.
                ...(quick ? { opacity: 1, transform: "none" } : {
                  // C letters slide in from sides via CSS; fill-mode:both holds them at -190/+190px before delay
                  ...(isLeft  ? { animation: "splashCSlideLeft  0.38s cubic-bezier(0.34,1.56,0.64,1) 2950ms both" } : {}),
                  ...(isRight ? { animation: "splashCSlideRight 0.38s cubic-bezier(0.34,1.56,0.64,1) 2950ms both" } : {}),
                  // Inner letters pop from scale 0.4, staggered 80ms apart
                  ...(isInner ? {
                    opacity: 0,
                    animation: `splashLetterPop 0.34s cubic-bezier(0.34,1.56,0.64,1) ${innerDelay}ms both`,
                  } : {}),
                }),
              }}>{char}</span>
            );
          })}

          {/* Plus sign: drops at 4050ms (already in place in quick mode) */}
          <span style={{
            position: "absolute", right: -16, top: -4,
            fontFamily: "'Fredoka One', cursive", fontSize: "1.4rem",
            color: "#c0392b", lineHeight: 1, display: "inline-block",
            opacity: quick ? 1 : 0,
            ...(quick ? { transform: "none" } : { animation: "plusDrop 0.65s cubic-bezier(0.34,1.56,0.64,1) 4050ms forwards" }),
            textShadow: "1px 1px 0 rgba(100,10,10,0.18)",
          }}>+</span>
        </div>
      </div>
    </div>
  );
}

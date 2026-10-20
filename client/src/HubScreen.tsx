import React, { useEffect, useRef, useState } from "react";

type HubDest = "allergy" | "feed" | "symptom";

interface HubItem {
  id: HubDest;
  label: string;
  desc: string;
  hasDoor: boolean;
  hasWindow: boolean;
  glowColor: string;
  lightColor: string;
}

const HUB_ITEMS: HubItem[] = [
  { id: "allergy",  label: "Allergy Tracker",  desc: "Monitor food & environmental triggers",
    hasDoor: false, hasWindow: true,  glowColor: "#5580e8", lightColor: "#b8d8ff" },
  { id: "feed",     label: "Home",              desc: "Your health & nutrition feed",
    hasDoor: true,  hasWindow: true,  glowColor: "#e89820", lightColor: "#f7e050" },
  { id: "symptom",  label: "Symptom Tracker",   desc: "Log and track how you feel",
    hasDoor: true,  hasWindow: false, glowColor: "#e86820", lightColor: "#f0a840" },
];

// ── Canonical mushroom paths ────────────────────────────────────────────────
const C_STEM  = "M-45 0 C-44-70-42-185-42-220 L42-220 C42-185 44-70 45 0Z";
const C_GILL  = "M-122-232 Q0-248 122-232";
const C_CAP   = "M-112-228 Q-115-296-100-342 Q-82-384-52-402 Q-28-414 0-417 Q28-414 52-402 Q82-384 100-342 Q115-296 112-228 Q56-244 0-246 Q-56-244-112-228Z";
const C_SHINE = "M-68-400 Q-32-416 0-417 Q32-414 58-401 Q76-392 86-375";
const C_DOOR  = "M-22 0 L-22-68 A22 22 0 0 1 22-68 L22 0Z";
const C_SHAD  = "M-54 0 Q0 14 54 0 Q42 20 0 22 Q-42 20-54 0Z";

const CAP_DOTS = [
  { cx: 0,   cy: -344, rx: 22, ry: 20 },
  { cx: -52, cy: -314, rx: 14, ry: 13 },
  { cx:  54, cy: -310, rx: 14, ry: 13 },
  { cx: -88, cy: -280, rx:  9, ry:  8 },
  { cx:  90, cy: -276, rx:  9, ry:  8 },
  { cx: -28, cy: -268, rx:  8, ry:  7 },
  { cx:  34, cy: -264, rx:  8, ry:  7 },
];

// ── Parallax mid-ground trees (separate from static bg so they can shift) ───
// Renders wider than the screen so edges never gap during drag parallax.
const ParallaxMidground = React.memo(
  React.forwardRef<HTMLDivElement>(function ParallaxMidground(_, ref) {
    return (
      <div ref={ref} style={{
        position: "absolute", top: 0, bottom: 0,
        left: -80, width: "calc(100% + 160px)",
        zIndex: 1, pointerEvents: "none",
        willChange: "transform",
      }}>
        <svg viewBox="-80 0 550 844" preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {/* Scattered mid-ground conifers between mushrooms */}
          <g fill="#040a12" opacity="0.78">
            <polygon points="148,770 172,310 196,770"/>
            <rect x="163" y="590" width="9" height="180" rx="3"/>
          </g>
          <g fill="#050e1a" opacity="0.60">
            <polygon points="204,770 224,380 244,770"/>
            <rect x="215" y="620" width="8" height="150" rx="3"/>
          </g>
          <g fill="#040a12" opacity="0.72">
            <polygon points="258,770 280,290 302,770"/>
            <rect x="272" y="580" width="9" height="190" rx="3"/>
          </g>
          {/* Wispy mist layers drifting between trees */}
          <ellipse cx="195" cy="640" rx="130" ry="26"
            fill="rgba(160,195,240,0.06)"/>
          <ellipse cx="120" cy="680" rx="90"  ry="20"
            fill="rgba(140,185,230,0.05)"/>
          <ellipse cx="270" cy="670" rx="100" ry="22"
            fill="rgba(140,185,230,0.05)"/>
          {/* Ground undergrowth */}
          <g fill="#0b1a10" opacity="0.70">
            <ellipse cx="155" cy="756" rx="28" ry="12"/>
            <ellipse cx="228" cy="750" rx="22" ry="10"/>
            <ellipse cx="175" cy="742" rx="18" ry="8"/>
          </g>
        </svg>
      </div>
    );
  })
);

// ── Shared static background (never re-renders) ─────────────────────────────
const STARS = [
  { x: 18,  y: 20,  r: 1.2 }, { x: 52,  y: 12,  r: 1.8, s: true },
  { x: 96,  y: 30,  r: 1.0 }, { x: 144, y: 16,  r: 1.5 },
  { x: 188, y:  8,  r: 1.2 }, { x: 228, y: 20,  r: 2.0, s: true },
  { x: 272, y: 14,  r: 1.0 }, { x: 318, y: 26,  r: 1.5 },
  { x: 362, y: 10,  r: 1.8, s: true }, { x: 34,  y: 62,  r: 1.0 },
  { x: 88,  y: 56,  r: 1.5 }, { x: 132, y: 70,  r: 1.2 },
  { x: 198, y: 52,  r: 1.8, s: true }, { x: 250, y: 62,  r: 1.0 },
  { x: 302, y: 72,  r: 1.5 }, { x: 350, y: 56,  r: 1.2 },
  { x: 382, y: 42,  r: 1.0 },
];

const BackgroundSVG = React.memo(function BackgroundSVG() {
  return (
    <svg
      viewBox="0 0 390 844"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
      aria-hidden
    >
      <defs>
        <linearGradient id="bg_sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#020508"/>
          <stop offset="20%"  stopColor="#031020"/>
          <stop offset="55%"  stopColor="#08182e"/>
          <stop offset="85%"  stopColor="#0c1e3a"/>
          <stop offset="100%" stopColor="#161a48"/>
        </linearGradient>
        <linearGradient id="bg_gnd" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#2a5430"/>
          <stop offset="42%"  stopColor="#142018"/>
          <stop offset="100%" stopColor="#030706"/>
        </linearGradient>
        <radialGradient id="bg_moon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="30%"  stopColor="#f5eea0"/>
          <stop offset="100%" stopColor="#f5eea0" stopOpacity="0"/>
        </radialGradient>
        <filter id="bg_blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="18"/>
        </filter>
        <filter id="bg_fly" x="-600%" y="-600%" width="1300%" height="1300%">
          <feGaussianBlur stdDeviation="5"/>
        </filter>
      </defs>

      {/* Sky */}
      <rect width="390" height="844" fill="url(#bg_sky)"/>

      {/* Milky Way */}
      <ellipse cx="270" cy="140" rx="78" ry="260"
        fill="#1a2858" opacity="0.24" transform="rotate(-28 270 140)"/>

      {/* Moon */}
      <circle cx="334" cy="58" r="50" fill="url(#bg_moon)" opacity="0.65"/>
      <circle cx="334" cy="58" r="24" fill="#f5eeaa"/>
      <circle cx="326" cy="50" r="7.5" fill="rgba(255,255,255,0.32)"/>

      {/* Stars */}
      {STARS.map((st, i) =>
        (st as {s?:boolean}).s ? (
          <g key={i} opacity="0.88">
            <line x1={st.x} y1={st.y - st.r * 3.2} x2={st.x} y2={st.y + st.r * 3.2}
              stroke="#c4d8f6" strokeWidth={st.r * 0.65}/>
            <line x1={st.x - st.r * 3.2} y1={st.y} x2={st.x + st.r * 3.2} y2={st.y}
              stroke="#c4d8f6" strokeWidth={st.r * 0.65}/>
            <circle cx={st.x} cy={st.y} r={st.r * 0.78} fill="#e4eeff"/>
          </g>
        ) : (
          <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#b0c8e8" opacity="0.68"/>
        )
      )}

      {/* Deep forest conifers: frame both sides of the scene */}
      <g fill="#030810">
        <polygon points="0,770  32,55   64,770" opacity="0.96"/>
        <polygon points="-6,770 20,135  50,770" opacity="0.88"/>
        <polygon points="42,770 72,185  102,770" opacity="0.80"/>
        <rect x="25" y="580" width="14" height="190" rx="5"/>
        <rect x="60" y="592" width="11" height="178" rx="4"/>
      </g>
      <g fill="#030810">
        <polygon points="390,770 358,55  326,770" opacity="0.96"/>
        <polygon points="396,770 370,135 340,770" opacity="0.88"/>
        <polygon points="348,770 318,185 288,770" opacity="0.80"/>
        <rect x="351" y="580" width="14" height="190" rx="5"/>
        <rect x="318" y="592" width="11" height="178" rx="4"/>
      </g>
      {/* Mid-depth trees */}
      <g fill="#050d1c" opacity="0.65">
        <polygon points="86,770  114,255 142,770"/>
        <polygon points="248,770 276,260 304,770"/>
        <rect x="106" y="594" width="10" height="176" rx="3"/>
        <rect x="268" y="598" width="10" height="172" rx="3"/>
      </g>

      {/* Horizon foliage */}
      <path d="M-14 502 Q44 478 88 492 Q134 504 172 482 Q212 462 252 480 Q292 496 334 472 Q368 454 404 478 L404 520 L-14 520Z"
        fill="#060e08" opacity="0.90"/>
      <path d="M-14 516 Q52 498 98 510 Q146 522 186 502 Q228 484 266 502 Q304 520 348 498 Q372 486 404 502 L404 530 L-14 530Z"
        fill="#040c06" opacity="0.80"/>

      {/* Mist near ground */}
      <ellipse cx="195" cy="716" rx="290" ry="56"
        fill="rgba(195,215,255,0.05)" filter="url(#bg_blur)"/>

      {/* Ground hill */}
      <path d="M-14 754 C 58 718 130 704 195 700 C 260 704 332 718 404 754 L404 848 L-14 848Z"
        fill="url(#bg_gnd)"/>
      <path d="M68 734 Q132 718 195 714 Q258 718 322 734"
        fill="none" stroke="rgba(70,150,55,0.18)" strokeWidth="3"/>

      {/* Fireflies: positioned in flanking tree/sky areas */}
      {[
        { x: 55,  y: 560, r: 2.5 }, { x: 28,  y: 480, r: 2.0 },
        { x: 335, y: 550, r: 2.5 }, { x: 362, y: 470, r: 2.0 },
        { x: 22,  y: 650, r: 1.8 }, { x: 368, y: 640, r: 1.8 },
        { x: 78,  y: 700, r: 2.0 }, { x: 312, y: 695, r: 2.0 },
      ].map((f, i) => (
        <g key={i}>
          <circle cx={f.x} cy={f.y} r={f.r + 5} fill="#b0ff48" opacity="0.07" filter="url(#bg_fly)"/>
          <circle cx={f.x} cy={f.y} r={f.r * 0.55} fill="#ccff70" opacity="0.70"/>
        </g>
      ))}
    </svg>
  );
});

// Mushroom card: transparent background, slides over the shared scene
// Scale 1.18 → cap width ~264 px inside a 340 px card (78% of card, 68% of screen)
// Leaves ~38 px breathing room each side so the forest background shows clearly.
function MushroomCardSVG({ item, idx }: { item: HubItem; idx: number }) {
  const p = (n: string) => `${n}_${idx}`;

  return (
    <svg
      viewBox="0 0 340 844"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <defs>
        <radialGradient id={p("cap")} cx="0.28" cy="0.18" r="0.74" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#f04444"/>
          <stop offset="22%"  stopColor="#cc2828"/>
          <stop offset="58%"  stopColor="#8c1212"/>
          <stop offset="100%" stopColor="#580808"/>
        </radialGradient>
        <linearGradient id={p("stem")} x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#f5edd6"/>
          <stop offset="18%"  stopColor="#ede0c2"/>
          <stop offset="55%"  stopColor="#d8c89c"/>
          <stop offset="88%"  stopColor="#c0a86c"/>
          <stop offset="100%" stopColor="#a89054"/>
        </linearGradient>
        <radialGradient id={p("door")} cx="0.5" cy="0.15" r="0.72" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#ffee58"/>
          <stop offset="45%"  stopColor={item.lightColor}/>
          <stop offset="100%" stopColor="#9a5808"/>
        </radialGradient>
        <radialGradient id={p("aura")} cx="0.5" cy="0.75" r="0.68" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor={item.glowColor} stopOpacity="0.70"/>
          <stop offset="100%" stopColor={item.glowColor} stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={p("win")} cx="0.5" cy="0.35" r="0.62" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor={item.lightColor}/>
          <stop offset="100%" stopColor="#c08820"/>
        </radialGradient>
        <radialGradient id={p("waura")} cx="0.5" cy="0.5" r="0.5" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor={item.lightColor} stopOpacity="0.52"/>
          <stop offset="100%" stopColor={item.lightColor} stopOpacity="0"/>
        </radialGradient>
        <filter id={p("shd")} x="-28%" y="-8%" width="156%" height="130%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="rgba(0,0,0,0.65)"/>
        </filter>
        <filter id={p("blur")} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="16"/>
        </filter>
        <filter id={p("gblur")} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="30"/>
        </filter>
      </defs>

      {/* Ambient door glow on ground */}
      {item.hasDoor && (
        <ellipse cx="170" cy="762" rx="185" ry="110"
          fill={item.glowColor} opacity="0.08" filter={`url(#${p("gblur")})`}/>
      )}

      {/* Mushroom: scale 1.18, base at y=775 */}
      <g transform="translate(170, 775) scale(1.18)" filter={`url(#${p("shd")})`}>
        <path d={C_SHAD} fill="rgba(0,0,0,0.35)"/>

        {/* Stem */}
        <path d={C_STEM} fill={`url(#${p("stem")})`} stroke="#a89050" strokeWidth="2.2"/>
        <path d="M-34-40 C-32-88-33-148-34-208" stroke="rgba(110,82,42,0.22)" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M 2-48 C  2-96  2-156   1-212" stroke="rgba(110,82,42,0.20)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <path d="M28-44 C 26-92  27-152  26-208" stroke="rgba(110,82,42,0.18)" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <ellipse cx="-30" cy="-76"  rx="8" ry="5"   fill="rgba(36,96,28,0.28)" transform="rotate(-22 -30 -76)"/>
        <ellipse cx=" 26" cy="-116" rx="7" ry="4.5" fill="rgba(36,96,28,0.22)" transform="rotate( 18  26 -116)"/>
        <ellipse cx="-18" cy="-168" rx="6" ry="4"   fill="rgba(36,96,28,0.18)" transform="rotate(-14 -18 -168)"/>
        <ellipse cx="-52" cy="0" rx="13" ry="5.5" fill="rgba(0,0,0,0.18)"/>
        <ellipse cx=" 52" cy="0" rx="13" ry="5.5" fill="rgba(0,0,0,0.18)"/>

        {/* Gill */}
        <path d={C_GILL} fill="none" stroke="#a87848" strokeWidth="2.5" strokeLinecap="round"/>

        {/* Cap */}
        <path d={C_CAP} fill={`url(#${p("cap")})`} stroke="#6a0e0e" strokeWidth="2.8"/>
        <path d={C_SHINE} stroke="rgba(255,255,255,0.30)" strokeWidth="9" fill="none" strokeLinecap="round"/>
        <path d="M-48-392 Q-18-410 12-414" stroke="rgba(255,255,255,0.16)" strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M-112-228 Q-56-240 0-242 Q56-240 112-228"
          fill="none" stroke="rgba(0,0,0,0.24)" strokeWidth="16"/>
        {CAP_DOTS.map((d, i) => (
          <g key={i}>
            <ellipse cx={d.cx+1.5} cy={d.cy+2.5} rx={d.rx+0.5} ry={d.ry+0.5} fill="rgba(0,0,0,0.14)"/>
            <ellipse cx={d.cx} cy={d.cy} rx={d.rx} ry={d.ry} fill="white" opacity="0.93"/>
          </g>
        ))}

        {/* Door */}
        {item.hasDoor && (
          <g>
            <ellipse cx="0" cy="-44" rx="88" ry="92" fill={`url(#${p("aura")})`}/>
            <path d={C_DOOR} fill={`url(#${p("door")})`} stroke="#b07810" strokeWidth="2.8"/>
            <line x1="0" y1="-4" x2="0" y2="-66" stroke="#9a6210" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="-18" y="-58" width="13" height="14" rx="2" fill="none" stroke="#9a6210" strokeWidth="1.3"/>
            <rect x="  5" y="-58" width="13" height="14" rx="2" fill="none" stroke="#9a6210" strokeWidth="1.3"/>
            <circle cx="15" cy="-32" r="3.8" fill="#c07818" stroke="#7c4e08" strokeWidth="1.3"/>
          </g>
        )}

        {/* Right window (Home: door + window) */}
        {item.hasWindow && item.hasDoor && (
          <g>
            <ellipse cx="30" cy="-122" rx="34" ry="30" fill={`url(#${p("waura")})`}/>
            <rect x="19" y="-133" width="22" height="20" rx="4"
              fill={`url(#${p("win")})`} stroke="#a07820" strokeWidth="2.3"/>
            <line x1="30" y1="-133" x2="30" y2="-113" stroke="#a07820" strokeWidth="1.3"/>
            <line x1="19" y1="-123" x2="41" y2="-123" stroke="#a07820" strokeWidth="1.3"/>
          </g>
        )}

        {/* Two windows (Allergy: no door) */}
        {item.hasWindow && !item.hasDoor && (
          <g>
            <ellipse cx="-30" cy="-122" rx="34" ry="30" fill={`url(#${p("waura")})`}/>
            <rect x="-41" y="-133" width="22" height="20" rx="4"
              fill={`url(#${p("win")})`} stroke="#a07820" strokeWidth="2.3"/>
            <line x1="-30" y1="-133" x2="-30" y2="-113" stroke="#a07820" strokeWidth="1.3"/>
            <line x1="-41" y1="-123" x2="-19" y2="-123" stroke="#a07820" strokeWidth="1.3"/>
            <ellipse cx="30" cy="-122" rx="34" ry="30" fill={`url(#${p("waura")})`}/>
            <rect x="19" y="-133" width="22" height="20" rx="4"
              fill={`url(#${p("win")})`} stroke="#a07820" strokeWidth="2.3"/>
            <line x1="30" y1="-133" x2="30" y2="-113" stroke="#a07820" strokeWidth="1.3"/>
            <line x1="19" y1="-123" x2="41" y2="-123" stroke="#a07820" strokeWidth="1.3"/>
          </g>
        )}
      </g>

      {/* Stone path */}
      {item.hasDoor && (
        <>
          <g fill="#566474" stroke="#3a4e5e" strokeWidth="0.8" opacity="0.68">
            <ellipse cx="170" cy="824" rx="24" ry="9.5" transform="rotate(-2 170 824)"/>
            <ellipse cx="170" cy="802" rx="19" ry="8"   transform="rotate(2 170 802)"/>
            <ellipse cx="170" cy="783" rx="15" ry="7"   transform="rotate(-1 170 783)"/>
            <ellipse cx="170" cy="767" rx="12" ry="6"   transform="rotate(1 170 767)"/>
            <ellipse cx="170" cy="754" rx="10" ry="5.5"/>
          </g>
          <ellipse cx="170" cy="784" rx="56" ry="40"
            fill={item.glowColor} opacity="0.13" filter={`url(#${p("blur")})`}/>
        </>
      )}

      {/* Foreground foliage at base */}
      <g>
        <ellipse cx="40"  cy="726" rx="38" ry="18" fill="#0e2614"/>
        <ellipse cx="18"  cy="718" rx="24" ry="15" fill="#142e1a"/>
        <ellipse cx="300" cy="724" rx="36" ry="18" fill="#0e2614"/>
        <ellipse cx="322" cy="716" rx="22" ry="15" fill="#142e1a"/>
        <ellipse cx="108" cy="748" rx="26" ry="13" fill="#1a3016"/>
        <ellipse cx="232" cy="746" rx="24" ry="13" fill="#1a3016"/>
      </g>
    </svg>
  );
}

// ── Carousel ─────────────────────────────────────────────────────────────────
const CARD_W         = 340;
// CARD_SPACING=310 → side card left edge at screen 335, right card right at screen 55.
// With scale 1.18 the cap half-width is 132 px, so the neighboring cap's inner edge
// appears at screen ~372 px (18 px of cap peeking in from each screen edge).
// overflow:hidden on each card div prevents shadow bleed across the 30 px overlap zone.
const CARD_SPACING   = 310;
const SNAP_THRESHOLD = 60;
const SNAP_TRANS     = "transform 0.48s cubic-bezier(0.34,1.56,0.64,1), opacity 0.36s ease";

const MushroomCardMemo = React.memo(MushroomCardSVG);

interface Props { onNavigate: (dest: HubDest | "settings" | "news") => void; onSettings: () => void; initialIdx?: number; }

export default function HubScreen({ onNavigate, onSettings, initialIdx }: Props) {
  const startIdx = initialIdx ?? 1;
  const [activeIdx, setActiveIdx] = useState(startIdx);
  const [showHint,  setShowHint ] = useState(false);

  const activeIdxRef = useRef(startIdx);
  // Fixed reference point for the very first (pre-JS) layout only, so it
  // never drifts once the user starts swiping (applyPositions takes over).
  const mountIdxRef  = useRef(startIdx);
  const startX       = useRef<number | null>(null);
  const draggingRef  = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const capturedRef  = useRef(false);
  const dragOffRef   = useRef(0);
  const cardRefs     = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const containerRef = useRef<HTMLDivElement>(null);
  const midParallaxRef = useRef<HTMLDivElement>(null);

  const userName = localStorage.getItem("cc_user_name") || "there";

  const applyPositions = (ai: number, raw: number, animate: boolean) => {
    const eff = ai === 0 && raw > 0 ? raw * 0.18
              : ai === 2 && raw < 0 ? raw * 0.18
              : raw;
    HUB_ITEMS.forEach((_, i) => {
      const el = cardRefs.current[i];
      if (!el) return;
      const dx   = (i - ai) * CARD_SPACING + eff;
      const dist = Math.min(Math.abs(dx) / CARD_SPACING, 1);
      // Depth cues: side cards shrink, blur, desaturate for atmospheric perspective
      const sc      = 1 - dist * 0.20;          // 1.0 active → ~0.80 side
      const blurPx  = dist * 2.2;               // 0px active → ~2.2px side
      const sat     = 1 - dist * 0.42;          // 1.0 active → ~0.58 side
      const trans   = animate ? SNAP_TRANS + ", filter 0.36s ease" : "none";
      el.style.transition = trans;
      el.style.transform  = `translateX(calc(-50% + ${dx}px)) scale(${sc.toFixed(3)})`;
      el.style.opacity    = String((1 - dist * 0.52).toFixed(3));
      el.style.filter     = `blur(${blurPx.toFixed(2)}px) saturate(${sat.toFixed(2)})`;
    });
    // Mid-ground parallax: shifts at 22% of mushroom speed → depth illusion
    if (midParallaxRef.current) {
      const trans = animate ? "transform 0.48s cubic-bezier(0.34,1.56,0.64,1)" : "none";
      midParallaxRef.current.style.transition = trans;
      midParallaxRef.current.style.transform  = `translateX(${(-eff * 0.22).toFixed(2)}px)`;
    }
  };

  useEffect(() => {
    activeIdxRef.current = activeIdx;
    applyPositions(activeIdx, 0, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  useEffect(() => {
    const t1 = setTimeout(() => setShowHint(true),  1800);
    const t2 = setTimeout(() => setShowHint(false), 5200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startX.current = e.clientX;
    dragOffRef.current = 0;
    draggingRef.current = true;
    if (containerRef.current) containerRef.current.style.cursor = "grabbing";
    // Don't capture the pointer yet: capturing on pointer-down makes the browser
    // dispatch the later `click` to this container instead of the tapped mushroom
    // card, so taps never navigate. Capture only once the gesture becomes a drag.
    pointerIdRef.current = e.pointerId;
    capturedRef.current = false;
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || startX.current === null) return;
    dragOffRef.current = e.clientX - startX.current;
    if (!capturedRef.current && Math.abs(dragOffRef.current) > 6 && pointerIdRef.current !== null) {
      try { e.currentTarget.setPointerCapture(pointerIdRef.current); } catch { /* pointer already gone */ }
      capturedRef.current = true;
    }
    applyPositions(activeIdxRef.current, dragOffRef.current, false);
  };

  const onUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    capturedRef.current = false;
    pointerIdRef.current = null;
    if (containerRef.current) containerRef.current.style.cursor = "default";
    const raw = dragOffRef.current;
    const ai  = activeIdxRef.current;
    dragOffRef.current = 0;
    startX.current = null;
    if      (raw >  SNAP_THRESHOLD && ai > 0) setActiveIdx(ai - 1);
    else if (raw < -SNAP_THRESHOLD && ai < 2) setActiveIdx(ai + 1);
    else applyPositions(ai, 0, true);
  };

  const handleClick = (i: number) => {
    if (!draggingRef.current && i === activeIdxRef.current && Math.abs(dragOffRef.current) < 10)
      onNavigate(HUB_ITEMS[i].id);
  };

  const initDx = (i: number) => (i - mountIdxRef.current) * CARD_SPACING;

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%",
        background: "#020508", overflow: "hidden", touchAction: "none" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {/* Static forest backdrop */}
      <BackgroundSVG/>
      {/* Mid-ground parallax layer (shifts at 22% drag speed) */}
      <ParallaxMidground ref={midParallaxRef}/>

      {/* ── Sliding mushroom cards ── */}
      {HUB_ITEMS.map((item, i) => {
        const dx0  = initDx(i);
        const dist = Math.min(Math.abs(dx0) / CARD_SPACING, 1);

        return (
          <div
            key={item.id}
            ref={el => { cardRefs.current[i] = el; }}
            onClick={() => handleClick(i)}
            style={{
              position: "absolute", top: 0, bottom: 0,
              width: CARD_W, left: "50%",
              transform: `translateX(calc(-50% + ${dx0}px))`,
              opacity: 1 - dist * 0.52,
              transition: SNAP_TRANS,
              cursor: "pointer",
              zIndex: i === mountIdxRef.current ? 6 : 5,
              willChange: "transform, opacity",
              overflow: "hidden",
            }}
          >
            <MushroomCardMemo item={item} idx={i}/>

            {/* NEWS button: only on the Home card, sits above the mushroom */}
            {item.id === "feed" && (
              <button
                onClick={e => { e.stopPropagation(); onNavigate("news"); }}
                style={{
                  position: "absolute", top: 158, left: "50%",
                  transform: "translateX(-50%)", zIndex: 10,
                  padding: "9px 26px", borderRadius: 20,
                  background: "rgba(192,57,43,0.85)",
                  border: "1.5px solid rgba(255,255,255,0.30)",
                  cursor: "pointer",
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: "0.92rem", letterSpacing: "0.04em",
                  color: "#f8f4ec",
                  boxShadow: "0 4px 16px rgba(192,57,43,0.40)",
                  backdropFilter: "blur(2px)",
                }}
              >NEWS</button>
            )}

            {/* Label */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              padding: "0 22px 104px",
              background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.48) 50%, transparent 100%)",
              pointerEvents: "none",
            }}>
              <div style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "2.2rem", lineHeight: 1.12,
                color: "#f8f4ec",
                textShadow: "0 2px 18px rgba(0,0,0,0.72)",
                letterSpacing: "0.01em", marginBottom: 7,
              }}>
                {item.label}
              </div>
              <div style={{
                fontFamily: "Outfit, Helvetica, sans-serif",
                fontWeight: 300, fontSize: "1.0rem",
                color: "rgba(218,206,186,0.65)",
                letterSpacing: "0.03em",
                textShadow: "0 1px 8px rgba(0,0,0,0.55)",
              }}>
                {item.desc}
              </div>
              <div style={{
                fontFamily: "Outfit, Helvetica, sans-serif",
                fontSize: "0.76rem", letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "rgba(196,180,152,0.35)", marginTop: 8,
              }}>
                tap to enter
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Header ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
        padding: "48px 20px 18px",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.80) 0%, transparent 100%)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        pointerEvents: "none",
      }}>
        {/* CapCare+ wordmark */}
        <div style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: "1.6rem", lineHeight: 1, color: "#f8f4f0",
          textShadow: "0 2px 14px rgba(0,0,0,0.64)",
        }}>
          CapCare<sup style={{ fontSize: "0.75rem", verticalAlign: "super" }}>+</sup>
        </div>
        {/* Greeting: visible, friendly, inviting */}
        <div style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: "1.5rem", lineHeight: 1,
          color: "#f8f0e4",
          textShadow: "0 2px 16px rgba(0,0,0,0.70)",
          letterSpacing: "0.01em",
        }}>
          Hey, {userName}!
        </div>
        {/* Gear button: settings entry point */}
        <button
          onClick={onSettings}
          style={{
            pointerEvents: "auto",
            background: "rgba(255,255,255,0.12)",
            border: "1.5px solid rgba(255,255,255,0.22)",
            borderRadius: 12, width: 38, height: 38,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: "1.1rem",
            color: "rgba(255,255,255,0.80)",
            transition: "background 0.15s ease",
          }}
        >⚙️</button>
      </div>

      {/* ── Dot indicators ── */}
      <div style={{
        position: "absolute", bottom: 48, left: "50%",
        transform: "translateX(-50%)",
        display: "flex", gap: 10, alignItems: "center", zIndex: 20,
      }}>
        {HUB_ITEMS.map((_, i) => (
          <div key={i} onClick={() => setActiveIdx(i)} style={{
            height: 8, borderRadius: 4,
            width: activeIdx === i ? 26 : 8,
            background: activeIdx === i ? "#c0392b" : "rgba(200,182,158,0.32)",
            transition: "width 0.32s ease, background 0.32s ease",
            cursor: "pointer",
          }}/>
        ))}
      </div>

      {/* ── Swipe hint ── */}
      <div style={{
        position: "absolute", bottom: 76, left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20, pointerEvents: "none",
        opacity: showHint ? 1 : 0,
        transition: "opacity 0.60s ease",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <span style={{
          fontFamily: "Outfit, Helvetica, sans-serif",
          fontSize: "1.15rem", color: "rgba(255,255,255,0.50)",
          display: "inline-block",
          animation: showHint ? "nudgeLeft 1.6s ease 0.2s infinite" : "none",
        }}>←</span>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          border: "1.5px solid rgba(255,255,255,0.28)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.1rem", color: "rgba(255,255,255,0.55)",
        }}>☞</div>
        <span style={{
          fontFamily: "Outfit, Helvetica, sans-serif",
          fontSize: "1.15rem", color: "rgba(255,255,255,0.50)",
          display: "inline-block",
          animation: showHint ? "nudgeRight 1.6s ease 0.2s infinite" : "none",
        }}>→</span>
      </div>
    </div>
  );
}

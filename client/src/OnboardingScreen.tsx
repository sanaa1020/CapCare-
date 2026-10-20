import React, { useEffect, useRef, useState } from "react";

// ─── Canonical mushroom-house paths ─────────────────────────────────────────
// Origin = stem base (0,0). Mushroom extends upward into negative-y space.
// Total height: ~415 canonical units (base→cap-top).
// Cap width: ~224 units. Stem width: ~90 units at base.
const C_STEM      = "M-45 0 C-44-70-42-185-42-220 L42-220 C42-185 44-70 45 0Z";
const C_GILL      = "M-122-232 Q0-248 122-232";
const C_CAP       = "M-112-228 Q-115-296-100-342 Q-82-384-52-402 Q-28-414 0-417 Q28-414 52-402 Q82-384 100-342 Q115-296 112-228 Q56-244 0-246 Q-56-244-112-228Z";
const C_CAP_INNER = "M-112-228 Q-115-296-100-342 Q-82-384-52-402 Q-28-414 0-417 Q28-414 52-402 Q82-384 100-342 Q115-296 112-228";
const C_SHINE     = "M-68-400 Q-32-416 0-417 Q32-414 58-401 Q76-392 86-375";
const C_DOOR      = "M-23 0 L-23-68 A23 23 0 0 1 23-68 L23 0Z";
const C_SHADOW    = "M-54 0 Q-54 10 0 12 Q54 10 54 0";

const CAP_DOTS = [
  {cx:0,   cy:-344, rx:22, ry:20, op:0.90},
  {cx:-50, cy:-312, rx:14, ry:13, op:0.85},
  {cx: 52, cy:-308, rx:14, ry:13, op:0.85},
  {cx:-89, cy:-278, rx:10, ry: 9, op:0.80},
  {cx: 90, cy:-274, rx:10, ry: 9, op:0.80},
  {cx:-30, cy:-268, rx: 8, ry: 7, op:0.76},
  {cx: 36, cy:-265, rx: 8, ry: 7, op:0.76},
  {cx:110, cy:-248, rx: 7, ry: 6, op:0.70},
  {cx:-108,cy:-248, rx: 7, ry: 6, op:0.70},
];

// ─── Reusable mushroom-house shape ─────────────────────────────────────────
function MushroomShape({
  hasDoor = false,
  hasWindow = false,
  ambient = false,
  sw = 2.5,
}: {
  hasDoor?: boolean; hasWindow?: boolean; ambient?: boolean; sw?: number;
}) {
  return (
    <>
      <path d={C_SHADOW} fill="rgba(0,0,0,0.25)"/>
      <path d={C_STEM} fill="url(#stemGrad)" stroke="#b89060" strokeWidth={sw - 0.3}/>
      <path d={C_GILL} fill="none" stroke="#b89060" strokeWidth={sw - 0.5} strokeLinecap="round"/>
      <path d={C_CAP} fill="url(#capGrad)" stroke="#7a1010" strokeWidth={sw}/>
      <path d={C_SHINE} stroke="rgba(255,255,255,0.30)" strokeWidth="8" fill="none" strokeLinecap="round"/>
      {CAP_DOTS.map((d, i) => (
        <ellipse key={i} cx={d.cx} cy={d.cy} rx={d.rx} ry={d.ry} fill="white" opacity={d.op}/>
      ))}
      {hasWindow && (
        <g>
          <ellipse cx="36" cy="-118" rx="26" ry="22" fill="url(#winAura)"/>
          <rect x="27" y="-128" width="22" height="20" rx="3.5"
            fill="url(#winGrad)" stroke="#b07818" strokeWidth={sw - 0.8}/>
          <line x1="38" y1="-128" x2="38" y2="-108" stroke="#b07818" strokeWidth="1.2"/>
          <line x1="27" y1="-118" x2="49" y2="-118" stroke="#b07818" strokeWidth="1.2"/>
        </g>
      )}
      {hasDoor && (
        <g>
          <ellipse cx="0" cy="-40" rx="65" ry="70" fill="url(#doorAura)"/>
          <path d={C_DOOR} fill="url(#doorGrad)" stroke="#c07810" strokeWidth={sw - 0.3}/>
          <line x1="0" y1="-8" x2="0" y2="-68" stroke="#a06010" strokeWidth="1.4" strokeLinecap="round"/>
          <rect x="-19" y="-60" width="14" height="15" rx="2" fill="none" stroke="#a06010" strokeWidth="1.2"/>
          <rect x="5"   y="-60" width="14" height="15" rx="2" fill="none" stroke="#a06010" strokeWidth="1.2"/>
          <circle cx="16" cy="-33" r="3.2" fill="#c07810" stroke="#906010" strokeWidth="1"/>
        </g>
      )}
      {ambient && (
        <rect x="-124" y="-430" width="248" height="440" fill="rgba(20,40,110,0.18)" rx="6"/>
      )}
    </>
  );
}

// ─── Foliage cluster: multi-tone overlapping shapes for organic texture ──────
function FoliageCluster({ cx, cy, r, warm = false }: { cx: number; cy: number; r: number; warm?: boolean }) {
  const base  = warm ? "#192e14" : "#0e2412";
  const mid   = warm ? "#1f3a18" : "#132e18";
  const light = warm ? "#263e1c" : "#163420";
  const tip   = warm ? "#2c421e" : "#1a3a1e";
  return (
    <g>
      <ellipse cx={cx}            cy={cy}            rx={r}        ry={r * 0.55} fill={base}/>
      <ellipse cx={cx - r * 0.3}  cy={cy - r * 0.22} rx={r * 0.65} ry={r * 0.45} fill={mid}/>
      <ellipse cx={cx + r * 0.32} cy={cy - r * 0.26} rx={r * 0.58} ry={r * 0.40} fill={light}/>
      <ellipse cx={cx}            cy={cy - r * 0.42} rx={r * 0.48} ry={r * 0.36} fill={tip} opacity="0.85"/>
    </g>
  );
}

// ─── Stars ──────────────────────────────────────────────────────────────────
const STARS = [
  {x:28,  y:40,  r:1.5, spark:false},
  {x:82,  y:28,  r:1,   spark:false},
  {x:148, y:50,  r:2,   spark:true },
  {x:215, y:18,  r:1.5, spark:false},
  {x:268, y:38,  r:1,   spark:false},
  {x:326, y:24,  r:2.5, spark:true },
  {x:372, y:55,  r:1.5, spark:false},
  {x:55,  y:95,  r:1,   spark:false},
  {x:128, y:84,  r:2,   spark:false},
  {x:198, y:72,  r:1.5, spark:true },
  {x:282, y:88,  r:1,   spark:false},
  {x:352, y:78,  r:2,   spark:false},
  {x:22,  y:132, r:1.5, spark:false},
  {x:176, y:122, r:2,   spark:false},
  {x:338, y:112, r:1,   spark:true },
  {x:66,  y:190, r:1,   spark:false},
  {x:308, y:172, r:1.5, spark:false},
  {x:158, y:210, r:1,   spark:false},
  {x:248, y:196, r:2,   spark:true },
  {x:388, y:142, r:1.5, spark:false},
  // extra depth stars
  {x:10,  y:68,  r:0.8, spark:false},
  {x:310, y:52,  r:0.8, spark:false},
  {x:94,  y:156, r:1,   spark:false},
  {x:360, y:196, r:0.8, spark:false},
  {x:170, y:168, r:1,   spark:false},
];

// ─── Main component ─────────────────────────────────────────────────────────
interface Props {
  onNavigate: (dest: "login" | "signup") => void;
}

// Short swipe (~10% of screen = ~39px) or fast flick is enough to commit.
const SWIPE_DIST_THRESHOLD  = 0.10;
const SWIPE_VEL_THRESHOLD   = 0.55; // px/ms, fast flick always commits

export default function OnboardingScreen({ onNavigate }: Props) {
  const [zoomed,     setZoomed    ] = useState(false);
  const [textStep,   setTextStep  ] = useState(0);
  // `rotation` is kept only for the swipe hint colour; visual rotation is
  // driven via DOM ref so React never re-renders during drag.
  const [rotation,   setRotation  ] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const dragStartX  = useRef<number | null>(null);
  const lastX       = useRef(0);
  const lastT       = useRef(0);
  const mushroomRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const ts = [
      setTimeout(() => setZoomed(true),   700),
      setTimeout(() => setTextStep(1),   2600),
      setTimeout(() => setTextStep(2),   3400),
      setTimeout(() => setTextStep(3),   4200),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  // Commit a swipe: play fixed full-rotation animation, then navigate.
  // Completely independent of how far the user dragged, always looks the same.
  const commitSwipe = (dir: "login" | "signup") => {
    if (navigating) return;
    setNavigating(true);
    const el = mushroomRef.current;
    if (el) {
      el.style.transition = "none";
      el.style.transform  = "perspective(560px) rotateY(0deg)";
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.46s cubic-bezier(0.55,0,0.45,1)";
        el.style.transform  = `perspective(560px) rotateY(${dir === "signup" ? 360 : -360}deg)`;
      });
    }
    setTimeout(() => onNavigate(dir), 480);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (navigating) return;
    // Don't start drag if tapping an arrow button
    if ((e.target as HTMLElement).closest("[data-arrow-btn]")) return;
    dragStartX.current = e.clientX;
    lastX.current = e.clientX;
    lastT.current = e.timeStamp;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    // Drive rotation via DOM ref, zero React renders during drag
    if (mushroomRef.current) {
      mushroomRef.current.style.transition = "none";
      mushroomRef.current.style.transform  = `perspective(560px) rotateY(${dx * 0.32}deg)`;
    }
    setRotation(dx * 0.32); // only for hint colour, batched by React
    lastX.current = e.clientX;
    lastT.current = e.timeStamp;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragStartX.current === null) return;

    const dx  = e.clientX - dragStartX.current;
    const dt  = e.timeStamp - lastT.current || 1;
    const vel = Math.abs(dx) / dt; // px/ms

    const distOk = Math.abs(dx) > window.innerWidth * SWIPE_DIST_THRESHOLD;
    const velOk  = vel > SWIPE_VEL_THRESHOLD;

    dragStartX.current = null;

    if ((distOk || velOk) && dx > 0) { commitSwipe("signup"); return; }
    if ((distOk || velOk) && dx < 0) { commitSwipe("login");  return; }

    // Not enough, spring back to rest
    setRotation(0);
    if (mushroomRef.current) {
      mushroomRef.current.style.transition = "transform 0.8s cubic-bezier(0.34,1.56,0.64,1)";
      mushroomRef.current.style.transform  = "perspective(560px) rotateY(0deg)";
    }
  };

  const swipeHintDir = Math.abs(rotation) > 28 ? (rotation > 0 ? "signup" : "login") : null;

  return (
    <div
      className="size-full relative overflow-hidden"
      style={{ touchAction: "none", cursor: isDragging ? "grabbing" : "grab", background: "#020810" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={e => handlePointerUp(e)}
      onPointerCancel={e => handlePointerUp(e as React.PointerEvent<HTMLDivElement>)}
    >
      {/* ── Zooming scene wrapper ── */}
      {/* scale(1.75) at "50% 52%" frames the complete hero cap + stem with breathing room */}
      <div style={{
        position: "absolute", inset: 0,
        transform: zoomed ? "scale(1.75)" : "scale(1)",
        transformOrigin: "50% 52%",
        transition: "transform 2.0s cubic-bezier(0.22,0.1,0.08,1)",
        willChange: "transform",
      }}>
        <svg
          viewBox="0 0 390 844"
          width="100%" height="100%"
          preserveAspectRatio="xMidYMid slice"
          style={{ display: "block" }}
        >
          <defs>
            {/* Richer night sky: near-black top → deep navy → indigo/purple horizon */}
            <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#010609"/>
              <stop offset="18%"  stopColor="#04101e"/>
              <stop offset="45%"  stopColor="#091830"/>
              <stop offset="72%"  stopColor="#0e2044"/>
              <stop offset="100%" stopColor="#1a1e58"/>
            </linearGradient>

            {/* Subtle Milky Way band: angled ellipse of hazy light */}
            <radialGradient id="milkyG" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%"   stopColor="#1c2a5c" stopOpacity="0.40"/>
              <stop offset="100%" stopColor="#1c2a5c" stopOpacity="0"/>
            </radialGradient>

            {/* Cap radial gradient */}
            <radialGradient id="capGrad" cx="0.33" cy="0.26" r="0.72" gradientUnits="objectBoundingBox">
              <stop offset="0%"   stopColor="#e03535"/>
              <stop offset="42%"  stopColor="#c0392b"/>
              <stop offset="100%" stopColor="#7a1212"/>
            </radialGradient>

            {/* Stem linear gradient */}
            <linearGradient id="stemGrad" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
              <stop offset="0%"   stopColor="#f2e6cc"/>
              <stop offset="38%"  stopColor="#e8d8b8"/>
              <stop offset="100%" stopColor="#c4a878"/>
            </linearGradient>

            {/* Door gradient: warm amber */}
            <radialGradient id="doorGrad" cx="0.5" cy="0.25" r="0.72" gradientUnits="objectBoundingBox">
              <stop offset="0%"   stopColor="#f7e244"/>
              <stop offset="55%"  stopColor="#f0a018"/>
              <stop offset="100%" stopColor="#c07010"/>
            </radialGradient>

            {/* Door ambient glow: wider falloff */}
            <radialGradient id="doorAura" cx="0.5" cy="0.65" r="0.65" gradientUnits="objectBoundingBox">
              <stop offset="0%"   stopColor="#f5a020" stopOpacity="0.65"/>
              <stop offset="100%" stopColor="#f5a020" stopOpacity="0"/>
            </radialGradient>

            {/* Window gradient */}
            <radialGradient id="winGrad" cx="0.5" cy="0.4" r="0.6" gradientUnits="objectBoundingBox">
              <stop offset="0%"   stopColor="#f7e050"/>
              <stop offset="100%" stopColor="#d09020"/>
            </radialGradient>

            {/* Window ambient glow */}
            <radialGradient id="winAura" cx="0.5" cy="0.5" r="0.5" gradientUnits="objectBoundingBox">
              <stop offset="0%"   stopColor="#f5c030" stopOpacity="0.50"/>
              <stop offset="100%" stopColor="#f5c030" stopOpacity="0"/>
            </radialGradient>

            {/* Ground gradient: deep dark green */}
            <linearGradient id="groundG" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
              <stop offset="0%"   stopColor="#1c4220"/>
              <stop offset="100%" stopColor="#040904"/>
            </linearGradient>

            {/* Foliage gradient */}
            <linearGradient id="foliageG" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
              <stop offset="0%"   stopColor="#0c2810"/>
              <stop offset="100%" stopColor="#060e06"/>
            </linearGradient>

            {/* Ground glow from hero door: warm amber falloff */}
            <radialGradient id="groundGlowG" cx="0.5" cy="0.1" r="0.75" gradientUnits="objectBoundingBox">
              <stop offset="0%"   stopColor="#f0900a" stopOpacity="0.32"/>
              <stop offset="55%"  stopColor="#e07808" stopOpacity="0.10"/>
              <stop offset="100%" stopColor="#c05800" stopOpacity="0"/>
            </radialGradient>

            {/* Moon soft glow */}
            <radialGradient id="moonG" cx="0.5" cy="0.5" r="0.5">
              <stop offset="30%"  stopColor="#f5eea0"/>
              <stop offset="100%" stopColor="#f5eea0" stopOpacity="0"/>
            </radialGradient>

            {/* Drop shadow filter */}
            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="rgba(0,0,0,0.40)"/>
            </filter>

            {/* Soft blur for ground glow */}
            <filter id="softBlur" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="16"/>
            </filter>

            {/* Small blur for window glow */}
            <filter id="smallBlur" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="9"/>
            </filter>

            {/* Very soft blur for large scene glow spread */}
            <filter id="bigBlur" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="28"/>
            </filter>
          </defs>

          {/* ── SKY ── */}
          <rect width="390" height="844" fill="url(#skyG)"/>

          {/* ── MILKY WAY haze band ── */}
          <ellipse cx="260" cy="200" rx="95" ry="340" fill="url(#milkyG)"
            transform="rotate(-28 260 200)"/>

          {/* ── MOON ── */}
          <circle cx="344" cy="66" r="52" fill="url(#moonG)" opacity="0.70"/>
          <circle cx="344" cy="66" r="24" fill="#f5eeaa"/>
          <circle cx="337" cy="59" r="7.5"  fill="rgba(255,255,255,0.36)"/>
          <circle cx="350" cy="72" r="4"    fill="rgba(255,248,190,0.20)"/>

          {/* ── STARS ── */}
          {STARS.map((s, i) =>
            s.spark ? (
              <g key={i} opacity="0.88">
                <line x1={s.x} y1={s.y - s.r*3} x2={s.x} y2={s.y + s.r*3} stroke="#c8dcf8" strokeWidth={s.r*0.7}/>
                <line x1={s.x - s.r*3} y1={s.y}  x2={s.x + s.r*3} y2={s.y}  stroke="#c8dcf8" strokeWidth={s.r*0.7}/>
                <circle cx={s.x} cy={s.y} r={s.r*0.8} fill="#e8f0ff"/>
              </g>
            ) : (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#b8ccee" opacity="0.70"/>
            )
          )}

          {/* ── BACKGROUND TREE SILHOUETTES ── */}
          <g fill="#050d1a">
            <rect x="28"  y="395" width="15" height="265" rx="4"/>
            <ellipse cx="36"  cy="366" rx="50" ry="52"/>
            <ellipse cx="18"  cy="382" rx="33" ry="36"/>
            <ellipse cx="56"  cy="379" rx="30" ry="34"/>
            <rect x="352" y="378" width="15" height="265" rx="4"/>
            <ellipse cx="360" cy="346" rx="48" ry="52"/>
            <ellipse cx="340" cy="362" rx="31" ry="36"/>
            <ellipse cx="378" cy="359" rx="29" ry="34"/>
            <rect x="104" y="432" width="10" height="200" rx="3"/>
            <ellipse cx="109" cy="414" rx="30" ry="32"/>
            <rect x="278" y="422" width="10" height="200" rx="3"/>
            <ellipse cx="283" cy="404" rx="28" ry="30"/>
          </g>

          {/* ── HORIZON FOLIAGE BAND ── */}
          <path d="M-12,476 Q38,450 78,463 Q118,474 158,454 Q198,436 238,452 Q278,466 318,448 Q358,432 402,458 L402,506 L-12,506Z"
            fill="url(#foliageG)"/>
          {/* Second layered ridge for depth */}
          <path d="M-12,492 Q48,472 88,481 Q138,490 178,472 Q218,456 258,472 Q298,488 338,465 Q368,450 402,468 L402,512 L-12,512Z"
            fill="#060e08" opacity="0.75"/>

          {/* ── GROUND HILL ── */}
          <path d="M-12 695 C 55 654 130 636 195 632 C 260 636 335 654 402 695 L402 848 L-12 848Z"
            fill="url(#groundG)"/>

          {/* GROUND GLOW from hero door: large amber warmth on grass & path */}
          {/* Wide outer falloff */}
          <ellipse cx="195" cy="640" rx="160" ry="110"
            fill="#f08010" opacity="0.10" filter="url(#bigBlur)"/>
          {/* Tighter core glow on stone path */}
          <ellipse cx="195" cy="670" rx="80" ry="50"
            fill="#f0a010" opacity="0.18" filter="url(#softBlur)"/>
          {/* Specular bright spot just below door */}
          <ellipse cx="195" cy="648" rx="34" ry="22"
            fill="#f5c040" opacity="0.14" filter="url(#smallBlur)"/>

          {/* ── FOREGROUND GRASS CLUSTERS (multi-tone for texture) ── */}
          {/* Left side */}
          <FoliageCluster cx={28}  cy={720} r={36}/>
          <FoliageCluster cx={70}  cy={730} r={28}/>
          <FoliageCluster cx={112} cy={738} r={22}/>
          {/* Right side */}
          <FoliageCluster cx={362} cy={718} r={33}/>
          <FoliageCluster cx={322} cy={728} r={26}/>
          <FoliageCluster cx={280} cy={736} r={20}/>
          {/* Center foreground: warm-tinted, lit by door */}
          <FoliageCluster cx={152} cy={752} r={28} warm/>
          <FoliageCluster cx={238} cy={750} r={26} warm/>
          <FoliageCluster cx={195} cy={762} r={20} warm/>

          {/* ── STONE PATH ── */}
          <g fill="#6a7c88" stroke="#4c5e68" strokeWidth="1">
            <ellipse cx="194" cy="816" rx="28" ry="12" transform="rotate(-3,194,816)"/>
            <ellipse cx="196" cy="790" rx="22" ry="10" transform="rotate(3,196,790)"/>
            <ellipse cx="198" cy="767" rx="18" ry="9"  transform="rotate(-2,198,767)"/>
            <ellipse cx="196" cy="746" rx="15" ry="7"  transform="rotate(2,196,746)"/>
            <ellipse cx="197" cy="728" rx="12" ry="6"  transform="rotate(-1,197,728)"/>
          </g>
          {/* Warm light on stone path near hero door */}
          <ellipse cx="196" cy="740" rx="28" ry="14"
            fill="#f5a020" opacity="0.12" filter="url(#smallBlur)"/>

          {/* ── SIDE MUSHROOMS (fade out on zoom) ── */}
          <g style={{ opacity: zoomed ? 0 : 1, transition: "opacity 1.0s ease 0.5s" }}>
            <g transform="translate(50,670) scale(0.52)">
              <MushroomShape ambient sw={3}/>
            </g>
            <g transform="translate(332,655) scale(0.64)">
              <MushroomShape ambient sw={2.8}/>
            </g>
          </g>

          {/* ── HERO MUSHROOM ── */}
          <g transform="translate(195, 638) scale(0.94)" filter="url(#dropShadow)">
            <g ref={mushroomRef} style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              transform: "perspective(560px) rotateY(0deg)",
              willChange: "transform",
            }}>
              <MushroomShape hasDoor hasWindow sw={2.5}/>
            </g>
          </g>

          {/* Ivy vines on hero stem (fade before zoom completes) */}
          <g style={{ opacity: zoomed ? 0 : 1, transition: "opacity 0.8s ease 0.2s" }}>
            <path d="M167 637 C160 608 176 580 162 550 C150 522 168 494 164 466"
              stroke="#1a5818" strokeWidth="2" fill="none" strokeLinecap="round"/>
            {[[163,624],[157,592],[163,560],[157,527]].map(([lx,ly],i)=>(
              <ellipse key={i} cx={lx} cy={ly} rx="7" ry="5" fill="#1e6020" stroke="#164814" strokeWidth="0.8"
                transform={`rotate(${i%2===0 ? -32 : 28},${lx},${ly})`}/>
            ))}
          </g>

          {/* Small accent mushrooms at hero base */}
          <g style={{ opacity: zoomed ? 0 : 1, transition: "opacity 0.8s ease" }}>
            <path d="M152 640 Q151 630 157 626 Q162 622 168 622 Q174 622 179 626 Q185 630 184 640 Q176 644 168 644 Q160 644 152 640Z"
              fill="#c0392b" stroke="#8b1a1a" strokeWidth="1.5"/>
            <rect x="165" y="640" width="6" height="9" rx="2" fill="#e8d8c0" stroke="#c9aa7c" strokeWidth="1"/>
            <path d="M213 640 Q212 630 218 626 Q223 622 229 622 Q235 622 240 626 Q246 630 245 640 Q237 644 229 644 Q221 644 213 640Z"
              fill="#c0392b" stroke="#8b1a1a" strokeWidth="1.5"/>
            <rect x="226" y="640" width="6" height="9" rx="2" fill="#e8d8c0" stroke="#c9aa7c" strokeWidth="1"/>
          </g>
        </svg>
      </div>

      {/* ── BOTTOM TEXT OVERLAY (headline + tagline) ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "0 80px 120px",
        background: "linear-gradient(to top, rgba(1,4,12,0.95) 0%, rgba(1,4,12,0.60) 55%, transparent 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        pointerEvents: "none",
      }}>
        <div style={{
          fontFamily: "'Fredoka One', cursive", fontSize: "2.5rem",
          color: "#f8f4f0", lineHeight: 1.1, textAlign: "center",
          textShadow: "0 2px 18px rgba(0,0,0,0.80)",
          opacity: textStep >= 1 ? 1 : 0,
          transform: textStep >= 1 ? "translateY(0)" : "translateY(22px)",
          transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          Protect Your Plate
        </div>

        {/* Tagline: bright white with strong shadow for legibility on any bg */}
        <div style={{
          fontFamily: "'Fredoka One', cursive", fontSize: "1.05rem",
          color: "#ffffff", textAlign: "center", letterSpacing: "0.02em",
          textShadow: "0 1px 10px rgba(0,0,0,0.80), 0 0 24px rgba(0,0,0,0.60)",
          opacity: textStep >= 2 ? 1 : 0,
          transform: textStep >= 2 ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.55s ease, transform 0.55s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          Capping what goes in your body
        </div>
      </div>

      {/* LEFT TAP ZONE: Log In (also tappable, not just swipeable) */}
      <div
        data-arrow-btn="1"
        onClick={() => { if (!navigating) commitSwipe("login"); }}
        style={{
          position: "absolute", bottom: 52, left: 24,
          display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
          cursor: "pointer", padding: "8px",
          opacity: textStep >= 3 ? 1 : 0,
          transform: textStep >= 3 ? "translateX(0)" : "translateX(-20px)",
          transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
          zIndex: 30,
        }}
      >
        <span style={{
          fontFamily: "'Fredoka One', cursive", fontSize: "2.2rem", lineHeight: 1,
          color: swipeHintDir === "login" ? "#f5c040" : "rgba(255,255,255,0.85)",
          textShadow: "0 2px 12px rgba(0,0,0,0.60)",
          animation: textStep >= 3 ? "nudgeLeft 1.7s ease-in-out infinite" : "none",
          display: "inline-block", transition: "color 0.18s ease",
        }}>←</span>
        <span style={{
          fontFamily: "'Fredoka One', cursive", fontSize: "1rem", letterSpacing: "0.03em",
          color: swipeHintDir === "login" ? "#f5c040" : "rgba(220,208,190,0.80)",
          textShadow: "0 1px 8px rgba(0,0,0,0.60)", transition: "color 0.18s ease",
        }}>Log In</span>
      </div>

      {/* RIGHT TAP ZONE: Sign Up (also tappable) */}
      <div
        data-arrow-btn="1"
        onClick={() => { if (!navigating) commitSwipe("signup"); }}
        style={{
          position: "absolute", bottom: 52, right: 24,
          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2,
          cursor: "pointer", padding: "8px",
          opacity: textStep >= 3 ? 1 : 0,
          transform: textStep >= 3 ? "translateX(0)" : "translateX(20px)",
          transition: "opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s",
          zIndex: 30,
        }}
      >
        <span style={{
          fontFamily: "'Fredoka One', cursive", fontSize: "2.2rem", lineHeight: 1,
          color: swipeHintDir === "signup" ? "#f5c040" : "rgba(255,255,255,0.85)",
          textShadow: "0 2px 12px rgba(0,0,0,0.60)",
          animation: textStep >= 3 ? "nudgeRight 1.7s ease-in-out 0.35s infinite" : "none",
          display: "inline-block", transition: "color 0.18s ease",
        }}>→</span>
        <span style={{
          fontFamily: "'Fredoka One', cursive", fontSize: "1rem", letterSpacing: "0.03em",
          color: swipeHintDir === "signup" ? "#f5c040" : "rgba(220,208,190,0.80)",
          textShadow: "0 1px 8px rgba(0,0,0,0.60)", transition: "color 0.18s ease",
        }}>Sign Up</span>
      </div>

      {/* ── ONE-TIME SWIPE GESTURE DEMO ── */}
      {textStep >= 3 && (
        <div style={{
          position: "absolute", top: "54%", left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none", zIndex: 20,
          animation: "swipeDemo 2.6s ease 0.6s both",
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
            border: "1.5px solid rgba(255,255,255,0.38)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.6rem",
          }}>
            ☞
          </div>
        </div>
      )}

      {/* Swipe orbit ring */}
      {Math.abs(rotation) > 18 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%, -50%) translateX(${rotation * 0.55}px)`,
          width: 54, height: 54,
          border: `2.5px solid rgba(245,192,64,${Math.min(Math.abs(rotation) / 130, 0.7)})`,
          borderRadius: "50%",
          pointerEvents: "none",
          transition: isDragging ? "none" : "all 0.75s cubic-bezier(0.34,1.56,0.64,1)",
        }}/>
      )}
    </div>
  );
}

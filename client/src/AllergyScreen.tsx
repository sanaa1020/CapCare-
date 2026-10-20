import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException, ChecksumException, FormatException } from "@zxing/library";
import {
  listBarcodeHistory,
  lookupBarcode,
  getAlternatives,
  type BarcodeHistoryEntry,
  type FoodProduct,
  type AlternativeProduct,
} from "./api";

interface Props { onBack: () => void; }

type ScanState = "idle" | "scanning" | "looking" | "done" | "error";
type MainView = "scanner" | "history";

function timeStr() { return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }); }
function dateStr() { return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

// Cross-check a user's saved allergens against this app's own allergen ids,
// producing the red-pill styling for matched allergens.
function allergenPillColor(id: string): string {
  if (id.includes("peanut")) return "#c0392b";
  if (id.includes("nut")) return "#c0392b";
  if (id.includes("dairy") || id.includes("milk")) return "#3498db";
  if (id.includes("gluten") || id.includes("wheat")) return "#e67e22";
  if (id.includes("soy")) return "#27ae60";
  return "#c0392b";
}

// Small mascot mushroom SVG for pop sequence
function MascotMush({ delay, size = 44 }: { delay: number; size?: number }) {
  return (
    <svg viewBox="0 0 44 48" width={size} height={Math.round(size * 48 / 44)}
      style={{
        opacity: 0,
        animation: `mushPop 0.55s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms forwards`,
        willChange: "transform, opacity",
        display: "block",
      }}
    >
      <path d="M15 32 C14 39 13 44 13 46 Q13 48 22 48 Q31 48 31 46 C31 44 30 39 29 32 Z" fill="#f2e8d6" stroke="#c9aa7c" strokeWidth="1.5"/>
      <path d="M11 32 Q22 36 33 32" fill="none" stroke="#c9aa7c" strokeWidth="1.2" strokeLinecap="round"/>
      <ellipse cx="16" cy="42" rx="4" ry="2.5" fill="#f4a0a0" opacity="0.45"/>
      <ellipse cx="28" cy="42" rx="4" ry="2.5" fill="#f4a0a0" opacity="0.45"/>
      <ellipse cx="18" cy="38" rx="2.2" ry="2.5" fill="#2a1a0a"/>
      <ellipse cx="19" cy="37" rx="0.8" ry="0.8" fill="white"/>
      <ellipse cx="26" cy="38" rx="2.2" ry="2.5" fill="#2a1a0a"/>
      <ellipse cx="27" cy="37" rx="0.8" ry="0.8" fill="white"/>
      <path d="M18.5 43 Q22 46 25.5 43" stroke="#2a1a0a" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <path d="M5 30 Q4 18 11 12 Q15 8 22 7 Q29 8 33 12 Q40 18 39 30 Q31 33 22 34 Q13 33 5 30Z"
        fill="#c0392b" stroke="#8b1a1a" strokeWidth="1.5"/>
      <path d="M11 14 Q17 10 22 10 Q27 10 33 14" stroke="rgba(255,255,255,0.25)" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <ellipse cx="22" cy="16" rx="5.5" ry="5" fill="white" opacity="0.90"/>
      <ellipse cx="12" cy="23" rx="3.8" ry="3.4" fill="white" opacity="0.85"/>
      <ellipse cx="32" cy="22" rx="3.8" ry="3.4" fill="white" opacity="0.85"/>
    </svg>
  );
}

// ── 3 staggered mascot mushrooms pointing toward View Results ─────────────────
function MushroomPopSequence({ onViewResults }: { onViewResults: () => void }) {
  return (
    <div style={{ padding: "14px 20px 0", animation: "slideUp 0.35s ease both" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, justifyContent: "center" }}>
          <MascotMush delay={80}  size={36}/>
          <MascotMush delay={200} size={44}/>
          <MascotMush delay={320} size={36}/>
        </div>
        <button
          onClick={onViewResults}
          style={{
            padding: "14px 32px", borderRadius: 16, border: "none",
            background: "linear-gradient(135deg, #c0392b 0%, #e04030 100%)",
            color: "white", fontFamily: "'Fredoka One', cursive", fontSize: "1.12rem",
            cursor: "pointer",
            boxShadow: "0 6px 22px rgba(192,57,43,0.38)",
            opacity: 0,
            animation: "slideUp 0.40s ease 0.50s both",
          }}
        >
          View Results →
        </button>
      </div>
    </div>
  );
}

// ── Real barcode/Open Food Facts product results page ────────────────────────
function ProductResultsView({
  product, matchedAllergens, alternatives, alternativesLoading, onBack, onDone,
}: {
  product: FoodProduct; matchedAllergens: string[];
  alternatives: AlternativeProduct[]; alternativesLoading: boolean;
  onBack: () => void; onDone: () => void;
}) {
  const nutriColor: Record<string, string> = {
    A: "#27ae60", B: "#7fb241", C: "#e6a817", D: "#e6741c", E: "#c0392b",
  };
  const grade = (product.nutriscore || "?").toUpperCase();
  const nColor = nutriColor[grade] || "#9a5040";

  const nutriRows: [string, string | number][] = [
    ["Energy (kcal/100g)", product.energy],
    ["Fat (g/100g)", product.fat],
    ["Saturated fat (g/100g)", product.saturated_fat],
    ["Carbohydrates (g/100g)", product.carbohydrates],
    ["Sugars (g/100g)", product.sugars],
    ["Protein (g/100g)", product.protein],
    ["Fiber (g/100g)", product.fiber],
    ["Salt (g/100g)", product.salt],
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 48px", display: "flex", flexDirection: "column", gap: 14, animation: "slideUp 0.35s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 4px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.88rem", color: "#c0392b", display: "flex", alignItems: "center", gap: 4 }}>← Back</button>
        <button onClick={onDone} style={{ background: "#c0392b", border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontFamily: "'Fredoka One', cursive", fontSize: "0.92rem", color: "white" }}>Done ✓</button>
      </div>

      <div style={{
        borderRadius: 16, padding: "14px 18px",
        background: matchedAllergens.length > 0 ? "rgba(192,57,43,0.12)" : "rgba(39,174,96,0.12)",
        border: `1.5px solid ${matchedAllergens.length > 0 ? "rgba(192,57,43,0.32)" : "rgba(39,174,96,0.32)"}`,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <svg viewBox="0 0 32 32" width="36" height="36">
          {matchedAllergens.length > 0 ? (
            <>
              <circle cx="16" cy="16" r="14" fill="rgba(192,57,43,0.18)" stroke="#c0392b" strokeWidth="1.5"/>
              <path d="M16 9 L16 18" stroke="#c0392b" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="16" cy="22" r="1.5" fill="#c0392b"/>
            </>
          ) : (
            <>
              <circle cx="16" cy="16" r="14" fill="rgba(39,174,96,0.18)" stroke="#27ae60" strokeWidth="1.5"/>
              <path d="M10 16 L14 20 L22 12" stroke="#27ae60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </>
          )}
        </svg>
        <div>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.05rem", color: matchedAllergens.length > 0 ? "#c0392b" : "#27ae60" }}>
            {matchedAllergens.length > 0
              ? `Matches ${matchedAllergens.length} of your allergen${matchedAllergens.length > 1 ? "s" : ""}`
              : "No match against your saved allergens"}
          </div>
          <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.78rem", color: "rgba(154,80,64,0.55)", marginTop: 2 }}>
            From Open Food Facts · barcode {product.barcode}
          </div>
        </div>
      </div>

      {matchedAllergens.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {matchedAllergens.map((a, i) => (
            <span key={i} style={{
              background: allergenPillColor(a), color: "white",
              fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.72rem", fontWeight: 500,
              padding: "4px 12px", borderRadius: 20,
            }}>{a.replace(/^other:/, "").replace(/_/g, " ")}</span>
          ))}
        </div>
      )}

      <div style={{
        borderRadius: 18, overflow: "hidden", background: "rgba(255,255,255,0.85)",
        border: "1.5px solid rgba(192,57,43,0.18)",
      }}>
        {product.image_url ? (
          <div style={{ background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 0" }}>
            <img
              src={product.image_url}
              alt={product.name}
              style={{ width: "auto", height: 220, maxWidth: "80%", objectFit: "contain" }}
            />
          </div>
        ) : (
          <div style={{ height: 160, background: "rgba(192,57,43,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.4rem" }}>🍄</div>
        )}
        <div style={{ padding: 14 }}>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.05rem", color: "#3a1810", lineHeight: 1.3 }}>{product.name}</div>
          <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.82rem", color: "rgba(154,80,64,0.65)", marginTop: 2 }}>{product.brand}{product.quantity !== "N/A" ? ` · ${product.quantity}` : ""}</div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: nColor, color: "white", fontFamily: "'Fredoka One', cursive", fontSize: "0.78rem", padding: "3px 10px", borderRadius: 20 }}>Nutri-Score {grade}</span>
          </div>
        </div>
      </div>

      <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.72rem", color: "rgba(154,80,64,0.50)", letterSpacing: "0.10em", textTransform: "uppercase" }}>Description</div>
      <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: "0.95rem", color: "#3a1810", lineHeight: 1.65 }}>{product.description}</div>

      <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.72rem", color: "rgba(154,80,64,0.50)", letterSpacing: "0.10em", textTransform: "uppercase" }}>Ingredients</div>
      <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: "0.95rem", color: "#3a1810", lineHeight: 1.65 }}>{product.ingredients}</div>
      {(product.allergens || product.traces) && (
        <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.80rem", color: "rgba(154,80,64,0.65)" }}>
          {product.allergens && <div>Declared allergens: {product.allergens.replace(/en:/g, "")}</div>}
          {product.traces && <div>May contain traces of: {product.traces.replace(/en:/g, "")}</div>}
        </div>
      )}

      <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.72rem", color: "rgba(154,80,64,0.50)", letterSpacing: "0.10em", textTransform: "uppercase" }}>Nutrition (per 100g)</div>
      {nutriRows.map(([label, val], i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", borderRadius: 12,
          background: "rgba(255,255,255,0.60)", border: "1px solid rgba(192,57,43,0.08)",
        }}>
          <span style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.88rem", color: "#3a1810" }}>{label}</span>
          <span style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.88rem", color: "rgba(154,80,64,0.75)" }}>{val}</span>
        </div>
      ))}

      {matchedAllergens.length > 0 && (
        <>
          <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.72rem", color: "rgba(154,80,64,0.50)", letterSpacing: "0.10em", textTransform: "uppercase", marginTop: 4 }}>Safer Alternatives</div>
          {alternativesLoading ? (
            <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.85rem", color: "rgba(154,80,64,0.55)", padding: "4px 2px" }}>
              Looking for products without these allergens…
            </div>
          ) : alternatives.length === 0 ? (
            <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.85rem", color: "rgba(154,80,64,0.45)", padding: "4px 2px" }}>
              No matching alternatives found in Open Food Facts for this category yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alternatives.map((alt, i) => {
                const altNutriColor: Record<string, string> = {
                  A: "#27ae60", B: "#7fb241", C: "#e6a817", D: "#e6741c", E: "#c0392b",
                };
                const altGrade = (alt.nutriscore || "?").toUpperCase();
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    borderRadius: 14, padding: "10px 12px",
                    background: "rgba(39,174,96,0.06)", border: "1px solid rgba(39,174,96,0.20)",
                  }}>
                    {alt.image_url ? (
                      <img
                        src={alt.image_url}
                        alt={alt.name}
                        style={{
                          width: 56, height: 56, borderRadius: 10, objectFit: "contain",
                          flexShrink: 0, background: "#ffffff", border: "1px solid rgba(39,174,96,0.18)", padding: 3,
                        }}
                      />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: 10, background: "rgba(39,174,96,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "1.4rem" }}>🍄</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontWeight: 500, fontSize: "0.88rem", color: "#3a1810", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{alt.name}</div>
                      <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.75rem", color: "rgba(154,80,64,0.55)" }}>{alt.brand}</div>
                    </div>
                    <span style={{ background: altNutriColor[altGrade] || "#9a5040", color: "white", fontFamily: "'Fredoka One', cursive", fontSize: "0.70rem", padding: "3px 9px", borderRadius: 20, flexShrink: 0 }}>{altGrade}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// History view: barcode scans only
function HistoryView({
  barcodeHistory, onClose,
}: { barcodeHistory: BarcodeHistoryEntry[]; onClose: () => void }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 48px", animation: "slideUp 0.35s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 12px" }}>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.4rem", color: "#3a1810" }}>Scan History</div>
        <button onClick={onClose} style={{ background: "rgba(192,57,43,0.10)", border: "1px solid rgba(192,57,43,0.20)", borderRadius: 10, padding: "6px 14px", cursor: "pointer", fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.82rem", color: "#c0392b" }}>Close</button>
      </div>

      {barcodeHistory.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 32, fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.88rem", color: "rgba(154,80,64,0.40)" }}>
          No scans yet, tap "Scan" to get started!
        </div>
      ) : barcodeHistory.map((s, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14,
          background: "rgba(255,255,255,0.70)", border: "1px solid rgba(192,57,43,0.10)",
          marginBottom: 10,
        }}>
          {s.imageUrl ? (
            <img src={s.imageUrl} alt={s.productName} style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}/>
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(192,57,43,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "1.2rem" }}>🍄</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.0rem", color: "#3a1810", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.productName}</div>
            <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.75rem", color: "rgba(154,80,64,0.55)", marginTop: 2 }}>
              {s.brand} · Nutri-Score {s.nutriscore}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main AllergyScreen ────────────────────────────────────────────────────────
export default function AllergyScreen({ onBack }: Props) {
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [product, setProduct]     = useState<FoodProduct | null>(null);
  const [matchedAllergens, setMatchedAllergens] = useState<string[]>([]);
  const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([]);
  const [alternativesLoading, setAlternativesLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [mainView, setMainView]   = useState<MainView>("scanner");
  const [showResults, setShowResults] = useState(false);
  const [barcodeHistory, setBarcodeHistory] = useState<BarcodeHistoryEntry[]>([]);

  const videoRef       = useRef<HTMLVideoElement>(null);
  const controlsRef    = useRef<{ stop: () => void; switchTorch?: (onOff: boolean) => Promise<void> } | null>(null);
  const lastCodeRef    = useRef<string | null>(null);
  const busyRef        = useRef(false);
  const streamRef      = useRef<MediaStream | null>(null);
  const attemptsRef    = useRef(0);
  const restartsRef    = useRef(0);
  const [torchOn, setTorchOn]           = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [scanDebug, setScanDebug]       = useState("");

  const stopCamera = () => {
    try { controlsRef.current?.stop(); } catch { /* already stopped */ }
    controlsRef.current = null;
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* noop */ }
    streamRef.current = null;
    setTorchOn(false);
    setTorchSupported(false);
    setScanDebug("");
  };

  const toggleTorch = async () => {
    if (!controlsRef.current?.switchTorch) return;
    try {
      await controlsRef.current.switchTorch(!torchOn);
      setTorchOn(t => !t);
    } catch { /* torch not actually usable on this device/browser */ }
  };

  useEffect(() => () => stopCamera(), []);

  const buildReader = () => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.ITF,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    return new BrowserMultiFormatReader(hints as any);
  };

  const openCameraStream = async (): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    streamRef.current = stream;
    const video = videoRef.current!;
    video.srcObject = stream;
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        video.removeEventListener("loadedmetadata", check);
        video.removeEventListener("canplay", check);
        resolve();
      };
      const check = () => { if (video.videoWidth > 0 && video.videoHeight > 0) finish(); };
      video.addEventListener("loadedmetadata", check);
      video.addEventListener("canplay", check);
      check();
      setTimeout(finish, 2500);
    });
    try { await video.play(); } catch { /* some browsers auto-play already */ }
    return stream;
  };

  const runScanLoop = async (stream: MediaStream) => {
    const reader = buildReader();
    attemptsRef.current = 0;
    const controls = await reader.decodeFromStream(
      stream,
      videoRef.current!,
      (result: any, err: any, ctrls: any) => {
        attemptsRef.current += 1;
        if (result && !busyRef.current) {
          const text: string = result.getText();
          if (text === lastCodeRef.current) return;
          lastCodeRef.current = text;
          busyRef.current = true;
          setScanDebug("");
          try { ctrls.stop(); } catch { /* noop */ }
          handleBarcodeDetected(text);
          return;
        }
        const isExpected =
          err instanceof NotFoundException ||
          err instanceof ChecksumException ||
          err instanceof FormatException;
        if (err && !isExpected && !busyRef.current) {
          console.warn("Barcode scan loop stopped unexpectedly:", err);
          if (restartsRef.current < 4) {
            restartsRef.current += 1;
            setScanDebug(`restarting scanner (${restartsRef.current}/4)…`);
            setTimeout(() => { if (!busyRef.current) runScanLoop(stream).catch(() => {}); }, 300);
          } else {
            setScanState("error");
            setScanError(`Scanner kept stopping unexpectedly (${err?.name || err?.message || "unknown error"}). Try reloading the page.`);
          }
          return;
        }
        if (attemptsRef.current % 15 === 0) {
          setScanDebug(`scanning… ${attemptsRef.current} frames checked`);
        }
      }
    );
    controlsRef.current = controls as unknown as { stop: () => void; switchTorch?: (onOff: boolean) => Promise<void> };
    setTorchSupported(typeof (controls as any)?.switchTorch === "function");
  };

  const startScan = async () => {
    setScanState("scanning");
    setScanError(null);
    setProduct(null);
    setMatchedAllergens([]);
    setAlternatives([]);
    setShowResults(false);
    setScanDebug("");
    lastCodeRef.current = null;
    busyRef.current = false;
    restartsRef.current = 0;

    try {
      for (let i = 0; i < 20 && !videoRef.current; i++) {
        await new Promise(r => setTimeout(r, 25));
      }
      if (!videoRef.current) throw new Error("Camera view not ready, try again");

      const stream = await openCameraStream();
      await runScanLoop(stream);
    } catch (err: any) {
      setScanState("error");
      setScanError(
        err?.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser settings and try again."
          : err?.name === "NotFoundError"
          ? "No camera was found on this device."
          : `Couldn't start the camera${err?.message ? `: ${err.message}` : "."}`
      );
    }
  };

  const handleBarcodeDetected = async (code: string) => {
    setScanState("looking");
    try {
      const { product: p, matchedAllergens: matched } = await lookupBarcode(code);
      setProduct(p);
      setMatchedAllergens(matched);
      setScanState("done");

      if (matched.length > 0) {
        setAlternativesLoading(true);
        getAlternatives(code)
          .then(setAlternatives)
          .catch(() => setAlternatives([]))
          .finally(() => setAlternativesLoading(false));
      } else {
        setAlternatives([]);
      }
    } catch (err: any) {
      setScanState("error");
      setScanError(
        err?.code === "NOT_FOUND"
          ? "No product found for this barcode in Open Food Facts."
          : err?.message || "Couldn't look up this product, check your internet connection and try again."
      );
    }
  };

  const handleDoneProduct = () => {
    setScanState("idle");
    setProduct(null);
    setMatchedAllergens([]);
    setAlternatives([]);
    setShowResults(false);
  };

  const openHistory = () => {
    setMainView("history");
    listBarcodeHistory().then(setBarcodeHistory).catch(() => {});
  };

  const isBusy = scanState === "scanning" || scanState === "looking";

  if (showResults && product) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", background: "linear-gradient(160deg,#fff8f5 0%,#fde8e0 55%,#f8d8cc 100%)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "52px 20px 0", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Montserrat', Helvetica, sans-serif", fontWeight: 700, fontSize: "1.55rem", color: "#c0392b" }}>Allergy Scanner</div>
        </div>
        <ProductResultsView
          product={product} matchedAllergens={matchedAllergens}
          alternatives={alternatives} alternativesLoading={alternativesLoading}
          onBack={() => setShowResults(false)} onDone={handleDoneProduct}
        />
      </div>
    );
  }

  if (mainView === "history") {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", background: "linear-gradient(160deg,#fff8f5 0%,#fde8e0 55%,#f8d8cc 100%)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "52px 20px 16px", display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.50)", borderBottom: "1.5px solid rgba(192,57,43,0.10)" }}>
          <button onClick={onBack} style={{ background: "rgba(192,57,43,0.10)", border: "1.5px solid rgba(192,57,43,0.22)", borderRadius: 12, color: "#c0392b", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1.1rem" }}>←</button>
          <div style={{ fontFamily: "'Montserrat', Helvetica, sans-serif", fontWeight: 700, fontSize: "1.55rem", color: "#c0392b" }}>Allergy Scanner</div>
        </div>
        <HistoryView barcodeHistory={barcodeHistory} onClose={() => setMainView("scanner")}/>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "linear-gradient(160deg,#fff8f5 0%,#fde8e0 55%,#f8d8cc 100%)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ padding: "52px 20px 16px", display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.50)", borderBottom: "1.5px solid rgba(192,57,43,0.10)" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Montserrat', Helvetica, sans-serif", fontWeight: 700, fontSize: "1.55rem", color: "#c0392b", lineHeight: 1.1 }}>Allergy Scanner</div>
          <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.82rem", fontWeight: 300, color: "rgba(154,80,64,0.60)", marginTop: 2 }}>Scan barcode · flag allergens instantly</div>
        </div>
        <button onClick={() => { stopCamera(); onBack(); }} style={{ background: "rgba(192,57,43,0.10)", border: "1.5px solid rgba(192,57,43,0.22)", borderRadius: 12, color: "#c0392b", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1.1rem" }}>←</button>
      </div>

      {/* Viewfinder */}
      <div style={{ position: "relative", margin: "16px 20px 0", borderRadius: 22, overflow: "hidden", height: 220, background: "linear-gradient(135deg, #1a0e08 0%, #2a1408 100%)", border: "1.5px solid rgba(192,57,43,0.28)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, #2a1a10 0%, #0e0806 100%)" }}/>

        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            opacity: isBusy ? 1 : 0,
            pointerEvents: "none",
          }}
        />

        {[{ top: 14, left: 14 }, { top: 14, right: 14 }, { bottom: 14, left: 14 }, { bottom: 14, right: 14 }].map((pos, i) => (
          <div key={i} style={{ position: "absolute", ...pos, width: 26, height: 26,
            borderTop:    ("top"    in pos) ? "2.5px solid rgba(192,57,43,0.70)" : "none",
            borderBottom: ("bottom" in pos) ? "2.5px solid rgba(192,57,43,0.70)" : "none",
            borderLeft:   ("left"   in pos) ? "2.5px solid rgba(192,57,43,0.70)" : "none",
            borderRight:  ("right"  in pos) ? "2.5px solid rgba(192,57,43,0.70)" : "none",
          } as React.CSSProperties}/>
        ))}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
          {scanState === "idle" && (
            <>
              <div style={{ fontSize: "2.8rem" }}>▣</div>
              <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.88rem", color: "rgba(160,190,230,0.55)", textAlign: "center", padding: "0 30px" }}>
                Point at barcode
              </div>
            </>
          )}
          {scanState === "scanning" && (
            <div style={{
              position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center",
              fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.78rem", color: "white",
              textShadow: "0 1px 6px rgba(0,0,0,0.80)", letterSpacing: "0.04em", padding: "0 16px", lineHeight: 1.4,
            }}>
              SCANNING FOR BARCODE…<br/>
              <span style={{ fontSize: "0.72rem", opacity: 0.85, letterSpacing: "normal" }}>
                Fill the frame · hold steady ~4–6in away · good light helps
              </span>
              {scanDebug && (
                <div style={{ fontSize: "0.66rem", opacity: 0.65, letterSpacing: "normal", marginTop: 3, fontFamily: "monospace" }}>
                  {scanDebug}
                </div>
              )}
            </div>
          )}
          {scanState === "scanning" && torchSupported && (
            <button
              onClick={toggleTorch}
              style={{
                position: "absolute", top: 10, right: 10, width: 34, height: 34, borderRadius: 10,
                border: "1.5px solid rgba(255,255,255,0.35)",
                background: torchOn ? "rgba(255,210,90,0.85)" : "rgba(0,0,0,0.35)",
                color: torchOn ? "#3a2400" : "white", fontSize: "1.05rem",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}
              aria-label="Toggle flashlight"
            >💡</button>
          )}
          {scanState === "looking" && <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.88rem", color: "rgba(80,200,120,0.85)", letterSpacing: "0.08em" }}>LOOKING UP PRODUCT…</div>}
          {scanState === "done" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.92rem", color: "rgba(80,200,120,0.90)" }}>
              <span style={{ fontSize: "1.3rem" }}>✓</span> Scan complete
            </div>
          )}
          {scanState === "error" && (
            <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.84rem", color: "rgba(255,150,140,0.92)", textAlign: "center", padding: "0 24px", lineHeight: 1.5 }}>
              {scanError}
            </div>
          )}
        </div>
      </div>

      {/* Scan button row */}
      <div style={{ padding: "16px 20px 0", display: "flex", gap: 12 }}>
        <button onClick={startScan} disabled={isBusy} style={{
          flex: 1, padding: "15px", borderRadius: 16, border: "none",
          background: isBusy ? "rgba(192,57,43,0.22)" : "#c0392b",
          color: "white", fontFamily: "'Fredoka One', cursive", fontSize: "1.08rem",
          cursor: isBusy ? "not-allowed" : "pointer",
          boxShadow: isBusy ? "none" : "0 4px 18px rgba(192,57,43,0.30)",
          transition: "all 0.25s ease",
        }}>
          {scanState === "scanning" ? "Scanning…"
            : scanState === "looking"  ? "Looking up…"
            : scanState === "done"     ? "Scan Again"
            : scanState === "error"    ? "Try Again"
            : "Tap to Scan"}
        </button>
        {scanState === "done" && (
          <button onClick={() => { setScanState("idle"); setProduct(null); setShowResults(false); }} style={{ padding: "15px 18px", borderRadius: 16, border: "1.5px solid rgba(192,57,43,0.25)", background: "rgba(192,57,43,0.08)", color: "#c0392b", fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.88rem", cursor: "pointer" }}>Clear</button>
        )}
      </div>

      {/* History: moved down from the header, right under the scan button */}
      <div style={{ padding: "10px 20px 0", display: "flex", justifyContent: "center" }}>
        <button onClick={openHistory} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.84rem", color: "#c0392b" }}>
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
            <circle cx="10" cy="10" r="8" stroke="#c0392b" strokeWidth="1.5"/>
            <path d="M10 5 L10 10 L13 13" stroke="#c0392b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Scan History
        </button>
      </div>

      {/* 3 mushroom characters → View Results */}
      {scanState === "done" && !showResults && (
        <MushroomPopSequence onViewResults={() => setShowResults(true)}/>
      )}

      {/* Results summary + Done button for a completed barcode scan */}
      {scanState === "done" && !showResults && product && (
        <div style={{ padding: "12px 20px 40px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{
            borderRadius: 14,
            background: matchedAllergens.length > 0 ? "rgba(192,57,43,0.14)" : "rgba(39,174,96,0.14)",
            border: `1.5px solid ${matchedAllergens.length > 0 ? "rgba(192,57,43,0.35)" : "rgba(39,174,96,0.35)"}`,
            padding: "13px 16px", display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: "1.6rem" }}>{matchedAllergens.length > 0 ? "⚠️" : "✅"}</span>
            <div>
              <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontWeight: 500, fontSize: "0.95rem", color: matchedAllergens.length > 0 ? "#c0392b" : "#27ae60" }}>
                {product.name}
              </div>
              <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.78rem", color: "rgba(154,80,64,0.50)", marginTop: 2 }}>
                {product.brand} · Nutri-Score {product.nutriscore}
              </div>
            </div>
          </div>
          <button onClick={handleDoneProduct} style={{
            width: "100%", padding: "14px", borderRadius: 14,
            border: "1.5px solid rgba(192,57,43,0.22)",
            background: "rgba(192,57,43,0.10)",
            color: "#c0392b", fontFamily: "'Fredoka One', cursive", fontSize: "1.05rem",
            cursor: "pointer",
          } as React.CSSProperties}>
            Done, save & close
          </button>
        </div>
      )}

      {/* Idle empty state */}
      {scanState === "idle" && (
        <div style={{ padding: "32px 20px 48px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.88rem", color: "rgba(154,80,64,0.45)", lineHeight: 1.7 }}>
            Tap scan to check a product for allergens.<br/>Scan the barcode on the packaging.
          </div>
        </div>
      )}
    </div>
  );
}
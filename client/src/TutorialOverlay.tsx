import { useState } from "react";
import type { TutorialContext } from "./App";

interface Props { context?: TutorialContext; onDone: () => void; }

interface TutStep {
  title: string; body: string;
  highlight: Record<string, string>;
  arrowDir: "up" | "down" | "left" | "right";
}

const HUB_STEPS: TutStep[] = [
  { title: "Welcome to CapCare+!", body: "This is your hub: three mushroom houses, each a different feature. Swipe left or right to explore.", highlight: { top: "25%", left: "10%", width: "80%", height: "55%" }, arrowDir: "down" },
  { title: "Scan for Allergens", body: "Swipe to the Allergy Tracker mushroom on the left, then tap it to open the barcode/label scanner.", highlight: { top: "25%", left: "0%", width: "30%", height: "55%" }, arrowDir: "right" },
  { title: "Log Symptoms", body: "The Symptom Tracker on the right lets you quickly log how you feel, what you ate, and more.", highlight: { top: "25%", right: "0%", width: "30%", height: "55%" }, arrowDir: "left" },
  { title: "Your Home Dashboard", body: "Tap the center mushroom to open your health feed, personal notes, and history reports.", highlight: { top: "20%", left: "20%", width: "60%", height: "60%" }, arrowDir: "up" },
  { title: "Settings & Help", body: "Tap the gear icon (top-right) anytime to access settings, edit your profile, or replay this tutorial.", highlight: { top: "42px", right: "16px", width: "48px", height: "48px" }, arrowDir: "up" },
];
const ALLERGY_STEPS: TutStep[] = [
  { title: "Tap to Scan", body: "Press the red 'Tap to Scan' button to start scanning a barcode or ingredient label.", highlight: { bottom: "30%", left: "10%", width: "80%", height: "10%" }, arrowDir: "down" },
  { title: "View Results", body: "After scanning, follow the animated arrow to 'View Results' to see full ingredient details and safer alternatives.", highlight: { top: "35%", left: "5%", width: "90%", height: "45%" }, arrowDir: "up" },
  { title: "Scan History", body: "Tap the clock icon (top-right header) to see all your previous scans.", highlight: { top: "52px", right: "72px", width: "44px", height: "44px" }, arrowDir: "down" },
  { title: "Done Button", body: "Tap 'Done, save & close' once reviewed to log this scan to your history.", highlight: { bottom: "15%", left: "10%", width: "80%", height: "12%" }, arrowDir: "up" },
];
const FEED_STEPS: TutStep[] = [
  { title: "Your Dashboard", body: "Home: health feed, personal insights, and notes all in one place.", highlight: { top: "48px", left: "5%", width: "90%", height: "20%" }, arrowDir: "down" },
  { title: "Latest Insight", body: "The insight card shows a quick summary of your activity at a glance.", highlight: { top: "22%", left: "5%", width: "90%", height: "10%" }, arrowDir: "down" },
  { title: "Show History", body: "Tap 'Show History' to see a tree chart of all your logged data.", highlight: { top: "33%", left: "5%", width: "44%", height: "8%" }, arrowDir: "down" },
  { title: "My Notes", body: "Tap 'My Notes' to add medical history, observations, or anything you want to remember.", highlight: { top: "33%", right: "5%", width: "44%", height: "8%" }, arrowDir: "down" },
  { title: "Health News", body: "Tap any article card to read the full story in our mushroom-branded magazine layout.", highlight: { top: "46%", left: "5%", width: "90%", height: "28%" }, arrowDir: "up" },
];
const SYMPTOM_STEPS: TutStep[] = [
  { title: "Log Your Symptoms", body: "Tap any item in the grid to log it: text labels, no emojis. Tap again to deselect.", highlight: { top: "40%", left: "5%", width: "90%", height: "32%" }, arrowDir: "down" },
  { title: "Custom 'Other' Entry", body: "The '+' button lets you type in anything not listed.", highlight: { top: "62%", right: "5%", width: "18%", height: "8%" }, arrowDir: "up" },
  { title: "Done Button", body: "After selecting items, a red 'Done' button appears to confirm your entries.", highlight: { top: "72%", left: "5%", width: "90%", height: "8%" }, arrowDir: "up" },
  { title: "View Records", body: "Switch to 'Records' tab to see your full logged history grouped by date.", highlight: { top: "78%", left: "5%", width: "40%", height: "6%" }, arrowDir: "up" },
];
const STEPS_MAP: Record<TutorialContext, TutStep[]> = { hub: HUB_STEPS, allergy: ALLERGY_STEPS, feed: FEED_STEPS, symptom: SYMPTOM_STEPS };

export default function TutorialOverlay({ context = "hub", onDone }: Props) {
  const STEPS = STEPS_MAP[context];
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.78)",
      display: "flex", flexDirection: "column",
      animation: "slideUp 0.35s ease both",
    }}>
      {/* Spotlight cutout rendered as box-shadow on a div matching the highlight rect */}
      <div style={{
        position: "absolute",
        ...current.highlight,
        borderRadius: 20,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
        border: "2px solid rgba(255,220,160,0.50)",
        pointerEvents: "none",
        transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      }}/>

      {/* Arrow indicator */}
      <div style={{
        position: "absolute",
        top: "calc(50% - 40px)", left: "50%",
        transform: "translateX(-50%)",
        fontSize: "2rem", opacity: 0.80,
        pointerEvents: "none",
        animation: "nudgeRight 1.5s ease-in-out infinite",
      }}>
        {current.arrowDir === "down" ? "↓" :
         current.arrowDir === "up" ? "↑" :
         current.arrowDir === "left" ? "←" : "→"}
      </div>

      {/* Content card at bottom */}
      <div style={{
        position: "absolute", bottom: 60, left: 20, right: 20,
        background: "linear-gradient(135deg, #fff8f5 0%, #fde8e0 100%)",
        borderRadius: 24, padding: "24px 24px 20px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.50)",
        transition: "all 0.35s ease",
      }}>
        {/* Step dots */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: 5, borderRadius: 3,
              width: i === step ? 22 : 6,
              background: i <= step ? "#c0392b" : "rgba(192,57,43,0.20)",
              transition: "width 0.3s ease, background 0.3s ease",
            }}/>
          ))}
        </div>

        <div style={{
          fontFamily: "'Fredoka One', cursive", fontSize: "1.3rem",
          color: "#3a1810", lineHeight: 1.2, marginBottom: 8,
        }}>{current.title}</div>

        <div style={{
          fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.92rem",
          color: "rgba(80,40,30,0.75)", lineHeight: 1.55, marginBottom: 20,
        }}>{current.body}</div>

        <div style={{ display: "flex", gap: 10 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              flex: 1, padding: "12px", borderRadius: 14,
              border: "2px solid rgba(192,57,43,0.25)", background: "transparent",
              color: "#c0392b", fontFamily: "'Fredoka One', cursive",
              fontSize: "1rem", cursor: "pointer",
            }}>← Back</button>
          )}
          <button onClick={() => isLast ? onDone() : setStep(s => s + 1)} style={{
            flex: 2, padding: "13px", borderRadius: 14, border: "none",
            background: "#c0392b", color: "white",
            fontFamily: "'Fredoka One', cursive", fontSize: "1.05rem",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(192,57,43,0.28)",
          }}>
            {isLast ? "Got it! 🍄" : "Next →"}
          </button>
        </div>

        {/* Skip link */}
        {!isLast && (
          <button onClick={onDone} style={{
            width: "100%", marginTop: 10, background: "none", border: "none",
            fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.80rem",
            color: "rgba(154,80,64,0.50)", cursor: "pointer", padding: "4px 0",
          }}>Skip tutorial</button>
        )}
      </div>
    </div>
  );
}

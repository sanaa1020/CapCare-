import { CSSProperties, useState } from "react";
import { updateProfile } from "./api";

interface Props { onComplete: () => void; }

// ── Mascot SVG ───────────────────────────────────────────────────────────────
function MascotSVG({ size = 130 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 140 158"
      width={size}
      height={Math.round(size * 158 / 140)}
      style={{ display: "block" }}
    >
      <line x1="95" y1="88" x2="72" y2="38"
        stroke="#8a6030" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="58" y="5"  width="18" height="42" rx="4" fill="#258a42" stroke="#1a6030" strokeWidth="1.5"/>
      <rect x="46" y="17" width="42" height="18" rx="4" fill="#258a42" stroke="#1a6030" strokeWidth="1.5"/>
      <path d="M60 8 Q67 6 74 9" stroke="rgba(255,255,255,0.28)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <ellipse cx="65" cy="96" rx="34" ry="38"
        fill="white" stroke="rgba(200,178,155,0.45)" strokeWidth="1.5"/>
      <ellipse cx="82" cy="96" rx="18" ry="32" fill="rgba(170,148,128,0.08)"/>
      <ellipse cx="33" cy="91" rx="9" ry="7"
        fill="white" stroke="rgba(200,178,155,0.45)" strokeWidth="1.2"
        transform="rotate(14 33 91)"/>
      <ellipse cx="97" cy="88" rx="9.5" ry="7"
        fill="white" stroke="rgba(200,178,155,0.45)" strokeWidth="1.2"
        transform="rotate(-14 97 88)"/>
      <path d="M21 64 Q19 38 36 25 Q50 15 65 13 Q80 15 94 25 Q111 38 109 64 Q88 72 65 73 Q42 72 21 64Z"
        fill="#cc2828" stroke="#8a1010" strokeWidth="1.5"/>
      <path d="M32 28 Q46 19 66 17 Q78 19 88 28"
        stroke="rgba(255,255,255,0.30)" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <circle cx="65" cy="35" r="9.5" fill="white" opacity="0.92"/>
      <circle cx="40" cy="53" r="6.5" fill="white" opacity="0.88"/>
      <circle cx="90" cy="51" r="6.5" fill="white" opacity="0.88"/>
      <path d="M21 64 Q65 77 109 64"
        fill="none" stroke="#a87848" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="54" cy="84" r="4.2" fill="#2a1a0a"/>
      <circle cx="76" cy="84" r="4.2" fill="#2a1a0a"/>
      <circle cx="55.5" cy="82.5" r="1.5" fill="white"/>
      <circle cx="77.5" cy="82.5" r="1.5" fill="white"/>
      <ellipse cx="42" cy="92" rx="9"  ry="5.5" fill="#ffb3ba" opacity="0.46"/>
      <ellipse cx="88" cy="92" rx="9"  ry="5.5" fill="#ffb3ba" opacity="0.46"/>
      <path d="M54 99 Q65 109 76 99"
        stroke="#2a1a0a" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <ellipse cx="50" cy="133" rx="12" ry="6.5"
        fill="white" stroke="rgba(200,178,155,0.45)" strokeWidth="1.2"/>
      <ellipse cx="80" cy="133" rx="12" ry="6.5"
        fill="white" stroke="rgba(200,178,155,0.45)" strokeWidth="1.2"/>
    </svg>
  );
}

const inputBase: CSSProperties = {
  width: "100%", padding: "13px 18px", borderRadius: 14,
  border: "2px solid rgba(192,57,43,0.22)", outline: "none",
  fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "1.05rem", fontWeight: 400,
  background: "rgba(255,255,255,0.72)", color: "#3a1810",
  boxSizing: "border-box",
};

function LabeledInput({
  label, placeholder, type = "text", value, onChange, error,
}: {
  label: string; placeholder: string; type?: string;
  value: string; onChange: (v: string) => void; error?: string;
}) {
  return (
    <div>
      <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.82rem", color: "#9a5040", marginBottom: 5, paddingLeft: 4 }}>
        {label}
      </div>
      <input
        style={{ ...inputBase, borderColor: error ? "#c0392b" : "rgba(192,57,43,0.22)" }}
        placeholder={placeholder}
        inputMode="numeric"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {error && (
        <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.76rem", color: "#c0392b", marginTop: 4, paddingLeft: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}

const ALLERGENS = [
  { id: "peanuts",   label: "Peanuts" },
  { id: "treenuts",  label: "Tree Nuts" },
  { id: "dairy",     label: "Dairy / Milk" },
  { id: "eggs",      label: "Eggs" },
  { id: "soy",       label: "Soy" },
  { id: "gluten",    label: "Gluten / Wheat" },
  { id: "fish",      label: "Fish" },
  { id: "shellfish", label: "Shellfish" },
  { id: "sesame",    label: "Sesame" },
  { id: "mustard",   label: "Mustard" },
  { id: "none",      label: "None of the above" },
];

// Small mushroom SVG chip icon
function MushChip({ selected }: { selected: boolean }) {
  return (
    <svg viewBox="0 0 20 18" width="16" height="15" style={{ flexShrink: 0, marginRight: 4 }}>
      <path d="M2 12 Q2 7 5 4 Q8 2 10 2 Q12 2 15 4 Q18 7 18 12 Q14 13.5 10 14 Q6 13.5 2 12Z"
        fill={selected ? "#c0392b" : "rgba(192,57,43,0.22)"} stroke={selected ? "#8b1a1a" : "rgba(192,57,43,0.35)"} strokeWidth="1"/>
      <ellipse cx="10" cy="7" rx="2.5" ry="2" fill="white" opacity={selected ? 0.9 : 0.5}/>
      <path d="M4 12 C4 16 10 17 10 17 C10 17 16 16 16 12" fill={selected ? "#f0d8b8" : "rgba(220,190,160,0.50)"} stroke="rgba(192,57,43,0.20)" strokeWidth="0.8"/>
    </svg>
  );
}

// ── Validation helpers ────────────────────────────────────────────────────────
function validateAge(v: string): string | undefined {
  const n = Number(v);
  if (!v) return "Age is required";
  if (isNaN(n) || n < 1 || n > 120) return "Age must be between 1–120";
}
function validateWeight(v: string): string | undefined {
  const n = Number(v);
  if (!v) return "Weight is required";
  if (isNaN(n) || n < 0 || n > 500) return "Weight must be between 0–500 kg";
}
function validateHeight(v: string): string | undefined {
  const n = Number(v);
  if (!v) return "Height is required";
  if (isNaN(n) || n < 50 || n > 300) return "Height must be between 50–300 cm";
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function OnboardingGuideScreen({ onComplete }: Props) {
  const [step,   setStep  ] = useState(0);
  const [name,   setName  ] = useState("");
  const [age,    setAge   ] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step 2: allergen selection
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [otherText, setOtherText]   = useState("");
  const [showOther, setShowOther]   = useState(false);

  const ageErr    = touched ? validateAge(age)       : undefined;
  const weightErr = touched ? validateWeight(weight) : undefined;
  const heightErr = touched ? validateHeight(height) : undefined;

  const step0Valid = name.trim().length > 0;
  const step1Valid = !validateAge(age) && !validateWeight(weight) && !validateHeight(height);
  const step2Valid = selected.size > 0 || otherText.trim().length > 0;

  const isValid = step === 0 ? step0Valid : step === 1 ? step1Valid : step2Valid;

  const handleContinue = async () => {
    if (step === 1) {
      setTouched(true);
      if (!step1Valid) return;
    }
    if (!isValid || saving) return;

    if (step < 2) {
      setStep(s => s + 1);
      setTouched(false);
    } else {
      const allergenList = [...selected];
      if (otherText.trim()) allergenList.push("other:" + otherText.trim());

      setSaving(true);
      try {
        await updateProfile({
          name: name.trim(),
          age: age.trim(),
          weight: weight.trim(),
          height: height.trim(),
          allergens: allergenList,
        });
      } catch {
        // Backend unreachable, updateProfile still caches nothing on failure,
        // so fall back to writing the raw values locally to avoid losing input.
        localStorage.setItem("cc_user_name", name.trim());
        if (age.trim())    localStorage.setItem("cc_age",    age.trim());
        if (weight.trim()) localStorage.setItem("cc_weight", weight.trim());
        if (height.trim()) localStorage.setItem("cc_height", height.trim());
        localStorage.setItem("cc_allergens", JSON.stringify(allergenList));
      } finally {
        setSaving(false);
      }
      onComplete();
    }
  };

  const toggleAllergen = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (id === "none") {
        if (next.has("none")) next.delete("none");
        else { next.clear(); next.add("none"); }
      } else {
        next.delete("none");
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const questions = [
    "First off, what should I call you?",
    "Tell me a bit about yourself",
    "What are you allergic to?",
  ];

  return (
    <div
      className="size-full flex flex-col items-center overflow-y-auto"
      style={{
        background: "linear-gradient(160deg,#fff8f5 0%,#fde8e0 55%,#f8d8cc 100%)",
        fontFamily: "Outfit, Helvetica, sans-serif",
        padding: "52px 32px 40px",
      }}
    >
      <MascotSVG size={step === 2 ? 96 : 128}/>

      {/* Speech bubble */}
      <div style={{
        marginTop: 10,
        background: "white",
        borderRadius: 20,
        padding: "15px 22px",
        maxWidth: 280,
        textAlign: "center",
        position: "relative",
        boxShadow: "0 4px 20px rgba(192,57,43,0.14)",
        fontFamily: "Lora, Georgia, serif",
        fontSize: "1.08rem",
        color: "#3a1810",
        lineHeight: 1.50,
        transition: "opacity 0.3s ease",
      }}>
        <div style={{
          position: "absolute", top: -10, left: "50%",
          transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderBottom: "10px solid white",
        }}/>
        {questions[step]}
      </div>

      {/* Step content */}
      <div
        key={step}
        style={{
          width: "100%", maxWidth: 340, marginTop: 26,
          display: "flex", flexDirection: "column", gap: 14,
          animation: "slideUp 0.42s ease both",
        }}
      >
        {step === 0 && (
          <input
            style={inputBase}
            placeholder="Your name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            onKeyDown={e => { if (e.key === "Enter") handleContinue(); }}
          />
        )}

        {step === 1 && (
          <>
            <LabeledInput
              label="Age (years)" placeholder="e.g. 25"
              value={age} onChange={setAge} error={ageErr}
            />
            <LabeledInput
              label="Weight (kg)" placeholder="e.g. 68"
              value={weight} onChange={setWeight} error={weightErr}
            />
            <LabeledInput
              label="Height (cm)" placeholder="e.g. 170"
              value={height} onChange={setHeight} error={heightErr}
            />
          </>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.82rem", color: "rgba(154,80,64,0.70)", paddingLeft: 2, marginBottom: 2 }}>
              Select all that apply
            </div>
            {ALLERGENS.map(a => (
              <button
                key={a.id}
                onClick={() => toggleAllergen(a.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "13px 16px", borderRadius: 14, border: "none",
                  background: selected.has(a.id) ? "rgba(192,57,43,0.12)" : "rgba(255,255,255,0.72)",
                  outline: selected.has(a.id) ? "2px solid rgba(192,57,43,0.45)" : "2px solid rgba(192,57,43,0.15)",
                  cursor: "pointer", textAlign: "left",
                  transition: "background 0.15s ease, outline 0.15s ease",
                }}
              >
                <MushChip selected={selected.has(a.id)}/>
                <span style={{
                  fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.98rem",
                  color: selected.has(a.id) ? "#c0392b" : "#3a1810", flex: 1,
                }}>{a.label}</span>
                {selected.has(a.id) && (
                  <svg viewBox="0 0 16 16" width="16" height="16">
                    <circle cx="8" cy="8" r="7" fill="#c0392b"/>
                    <path d="M4.5 8 L7 10.5 L11.5 5.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}

            {/* Other option */}
            <button
              onClick={() => setShowOther(s => !s)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "13px 16px", borderRadius: 14, border: "none",
                background: showOther ? "rgba(192,57,43,0.12)" : "rgba(255,255,255,0.72)",
                outline: showOther ? "2px solid rgba(192,57,43,0.45)" : "2px dashed rgba(192,57,43,0.28)",
                cursor: "pointer", textAlign: "left",
                transition: "background 0.15s ease",
              }}
            >
              <svg viewBox="0 0 16 16" width="16" height="16" style={{ flexShrink: 0, marginRight: 4 }}>
                <circle cx="8" cy="8" r="7" fill="rgba(192,57,43,0.18)" stroke="rgba(192,57,43,0.40)" strokeWidth="1"/>
                <path d="M5 8 H11 M8 5 V11" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <span style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.98rem", color: "#3a1810" }}>Other</span>
            </button>

            {showOther && (
              <input
                style={{ ...inputBase, marginTop: -4 }}
                placeholder="Describe your allergy…"
                value={otherText}
                onChange={e => setOtherText(e.target.value)}
                autoFocus
              />
            )}
          </div>
        )}

        <button
          onClick={handleContinue}
          style={{
            width: "100%", padding: "15px", borderRadius: 14, border: "none",
            background: isValid ? "#c0392b" : "rgba(192,57,43,0.30)",
            color: "white",
            fontFamily: "'Fredoka One', cursive", fontSize: "1.12rem",
            cursor: isValid ? "pointer" : "default", marginTop: 4,
            boxShadow: isValid ? "0 4px 16px rgba(192,57,43,0.28)" : "none",
            transition: "background 0.25s ease, box-shadow 0.25s ease",
          }}
        >
          {step < 2 ? "Continue →" : saving ? "Saving…" : "Let's go! →"}
        </button>

        {/* Step progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 2 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              height: 6, borderRadius: 3,
              width: step === i ? 22 : 8,
              background: step >= i ? "#c0392b" : "rgba(192,57,43,0.20)",
              transition: "width 0.3s ease, background 0.3s ease",
            }}/>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { updateProfile } from "./api";

const ALLERGENS_LIST = [
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

interface Props {
  onBack: () => void;
  onLogout: () => void;
  onShowTutorial: () => void;
}

// ── SVG icon set (no generic emojis) ─────────────────────────────────────────
function IconTutorial() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#c0392b" strokeWidth="1.8"/>
      {/* Standard ? arc: starts left, curves up+right, comes back down-center */}
      <path d="M9.5 9 C9.5 7 10.5 6 12 6 C13.5 6 14.5 7 14.5 8.5 C14.5 10.2 13 10.8 12 12 L12 13.5"
        stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="16.5" r="1" fill="#c0392b"/>
    </svg>
  );
}
function IconAbout() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M4 14 Q3 8 6 5 Q9 2 12 2 Q15 2 18 5 Q21 8 20 14 Q17 16 12 17 Q7 16 4 14Z" fill="#c0392b" opacity="0.15" stroke="#c0392b" strokeWidth="1.5"/>
      <ellipse cx="12" cy="8.5" rx="2" ry="1.8" fill="white"/>
      <path d="M5 14 C5 19 12 21 12 21 C12 21 19 19 19 14" fill="#f0d8b8" stroke="#c0392b" strokeWidth="1"/>
    </svg>
  );
}
function IconProfile() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <circle cx="12" cy="8" r="4" stroke="#c0392b" strokeWidth="1.8"/>
      <path d="M4 20 C4 16 7.6 13 12 13 C16.4 13 20 16 20 20" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M9 4 H5 C4.4 4 4 4.4 4 5 V19 C4 19.6 4.4 20 5 20 H9" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M14 8 L20 12 L14 16" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="20" y1="12" x2="9" y2="12" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

// Small mushroom icon
function MushIcon() {
  return (
    <svg viewBox="0 0 56 50" width="40" height="36">
      <path d="M6 38 Q5 24 12 16 Q18 8 28 7 Q38 8 44 16 Q51 24 50 38 Q40 42 28 43 Q16 42 6 38Z"
        fill="#c0392b" stroke="#8b1a1a" strokeWidth="1.5"/>
      <ellipse cx="28" cy="20" rx="7" ry="6.5" fill="white" opacity="0.92"/>
      <ellipse cx="17" cy="27" rx="5" ry="4.5" fill="white" opacity="0.84"/>
      <ellipse cx="40" cy="26" rx="5" ry="4.5" fill="white" opacity="0.84"/>
      <path d="M12 38 C11 46 28 49 28 49 C28 49 45 46 44 38 C41 40 28 41 28 41 C28 41 15 40 12 38Z"
        fill="#f0e0c8" stroke="#c9aa7c" strokeWidth="1.2"/>
    </svg>
  );
}

function SettingRow({ icon, label, sub, onClick, danger = false }: {
  icon: React.ReactNode; label: string; sub?: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 14,
      padding: "16px 20px", background: "rgba(255,255,255,0.72)",
      border: "none", borderRadius: 16, cursor: "pointer",
      transition: "background 0.15s ease", textAlign: "left",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.92)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.72)"; }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: "'Fredoka One', cursive", fontSize: "1.05rem",
          color: danger ? "#c0392b" : "#3a1810", lineHeight: 1.2,
        }}>{label}</div>
        {sub && <div style={{
          fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.78rem",
          color: "rgba(154,80,64,0.60)", marginTop: 2,
        }}>{sub}</div>}
      </div>
      <span style={{ color: danger ? "#c0392b" : "rgba(154,80,64,0.45)", fontSize: "1.1rem" }}>›</span>
    </button>
  );
}

// ── About CapCare+ interactive view ──────────────────────────────────────────
const ABOUT_SECTIONS = [
  {
    id: "what",
    title: "🍄 What is CapCare+?",
    body: "CapCare+ is your pocket-sized allergen ally. It tracks what you eat, logs how you feel, and helps you spot patterns between your diet and symptoms, all without the clipboard-and-highlighter chaos.",
  },
  {
    id: "why",
    title: "💡 Why does it exist?",
    body: "Over 32 million people have food allergies, yet most tracking apps feel like filing a tax return. CapCare+ was built to be the opposite: friendly, visual, and fast enough to use at a restaurant when the waiter is already hovering.",
  },
  {
    id: "mascot",
    title: "Who's the mushroom?",
    body: "That's Cap, our mascot! Fungi are fascinating: they're neither plant nor animal, they form vast underground networks, and some are medicinal. Cap embodies CapCare+'s spirit: small, mighty, and surprisingly good for you.",
  },
  {
    id: "privacy",
    title: "🔒 Your data stays yours",
    body: "Everything you log is stored on your own CapCare+ server, in your own database. We don't sell data, we don't have ad partners, and Cap definitely doesn't gossip.",
  },
];

function AboutView({ onBack }: { onBack: () => void }) {
  const [expanded, setExpanded] = useState<string | null>("what");

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 40px", display: "flex", flexDirection: "column", gap: 10, animation: "slideUp 0.4s ease both" }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", cursor: "pointer",
        fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.88rem",
        color: "#c0392b", textAlign: "left", padding: "0 0 8px",
        display: "flex", alignItems: "center", gap: 4,
      }}>← Back to Settings</button>

      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.8rem", color: "#3a1810", marginBottom: 8 }}>
        About CapCare+
      </div>
      <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.90rem", color: "rgba(154,80,64,0.70)", marginBottom: 12, lineHeight: 1.5 }}>
        Version 1.0, tap any section to expand
      </div>

      {ABOUT_SECTIONS.map(s => {
        const open = expanded === s.id;
        return (
          <div key={s.id} style={{
            borderRadius: 18, overflow: "hidden",
            background: open ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.60)",
            border: `1.5px solid ${open ? "rgba(192,57,43,0.30)" : "rgba(192,57,43,0.12)"}`,
            transition: "border-color 0.2s ease, background 0.2s ease",
          }}>
            <button
              onClick={() => setExpanded(open ? null : s.id)}
              style={{
                width: "100%", padding: "16px 20px",
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                textAlign: "left",
              }}
            >
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.02rem", color: "#3a1810" }}>
                {s.title}
              </div>
              <span style={{
                color: "#c0392b", fontSize: "1rem",
                transform: open ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.25s ease", display: "inline-block",
              }}>›</span>
            </button>
            {open && (
              <div style={{
                padding: "0 20px 18px",
                fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.92rem",
                color: "#5a2810", lineHeight: 1.65,
                animation: "slideUp 0.22s ease both",
              }}>
                {s.body}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Edit Profile view ─────────────────────────────────────────────────────────
const fieldStyle = {
  width: "100%", padding: "12px 16px", borderRadius: 13,
  border: "2px solid rgba(192,57,43,0.22)", outline: "none",
  fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "1.0rem",
  background: "rgba(255,255,255,0.80)", color: "#3a1810",
  boxSizing: "border-box" as const,
};

function EditProfileView({ onBack }: { onBack: () => void }) {
  const [name,    setName   ] = useState(localStorage.getItem("cc_user_name") || "");
  const [age,     setAge    ] = useState(localStorage.getItem("cc_age")       || "");
  const [weight,  setWeight ] = useState(localStorage.getItem("cc_weight")    || "");
  const [height,  setHeight ] = useState(localStorage.getItem("cc_height")    || "");
  const [saved,   setSaved  ] = useState(false);
  const [saving,  setSaving ] = useState(false);
  const [editingAllergies, setEditingAllergies] = useState(false);

  const initialAllergens = (() => {
    try { return JSON.parse(localStorage.getItem("cc_allergens") || "[]") as string[]; }
    catch { return [] as string[]; }
  })();
  const [selectedAllergens, setSelectedAllergens] = useState<Set<string>>(
    new Set(initialAllergens.filter(a => !a.startsWith("other:")))
  );
  const [otherText, setOtherText] = useState(
    initialAllergens.find(a => a.startsWith("other:"))?.replace("other:", "") || ""
  );

  const toggleAllergen = (id: string) => {
    setSelectedAllergens(prev => {
      const next = new Set(prev);
      if (id === "none") { next.clear(); next.add("none"); return next; }
      next.delete("none");
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (saving) return;
    const allergenList = [...selectedAllergens];
    if (otherText.trim()) allergenList.push("other:" + otherText.trim());

    setSaving(true);
    try {
      await updateProfile({
        name: name.trim() || undefined,
        age: age.trim(),
        weight: weight.trim(),
        height: height.trim(),
        allergens: allergenList,
      });
    } catch {
      // Server unreachable, still keep the user's edits visible locally
      if (name.trim()) localStorage.setItem("cc_user_name", name.trim());
      localStorage.setItem("cc_age", age.trim());
      localStorage.setItem("cc_weight", weight.trim());
      localStorage.setItem("cc_height", height.trim());
      localStorage.setItem("cc_allergens", JSON.stringify(allergenList));
    } finally {
      setSaving(false);
      setSaved(true);
      setEditingAllergies(false);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const rows: { label: string; value: string; set: (v: string) => void; placeholder: string; mode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }[] = [
    { label: "Name",         value: name,   set: setName,   placeholder: "Your name" },
    { label: "Age (years)",  value: age,    set: setAge,    placeholder: "e.g. 25",  mode: "numeric" },
    { label: "Weight (kg)",  value: weight, set: setWeight, placeholder: "e.g. 68",  mode: "numeric" },
    { label: "Height (cm)",  value: height, set: setHeight, placeholder: "e.g. 170", mode: "numeric" },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 40px", display: "flex", flexDirection: "column", gap: 14, animation: "slideUp 0.4s ease both" }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", cursor: "pointer",
        fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.88rem",
        color: "#c0392b", textAlign: "left", padding: "0 0 4px",
        display: "flex", alignItems: "center", gap: 4,
      }}>← Back to Settings</button>

      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.8rem", color: "#3a1810" }}>Edit Profile</div>

      {rows.map(r => (
        <div key={r.label}>
          <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.80rem", color: "#9a5040", marginBottom: 5 }}>{r.label}</div>
          <input
            style={fieldStyle}
            placeholder={r.placeholder}
            value={r.value}
            onChange={e => r.set(e.target.value)}
            inputMode={r.mode}
          />
        </div>
      ))}

      {/* Allergen section: inline checklist (same as onboarding step 2) */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.80rem", color: "#9a5040" }}>Known Allergies</div>
          <button
            onClick={() => setEditingAllergies(v => !v)}
            style={{
              background: "rgba(192,57,43,0.10)", border: "1px solid rgba(192,57,43,0.22)",
              borderRadius: 8, padding: "4px 12px", cursor: "pointer",
              fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.76rem", color: "#c0392b",
            }}
          >{editingAllergies ? "Done editing" : "Edit Allergies"}</button>
        </div>

        {!editingAllergies && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[...selectedAllergens].map(a => (
              <span key={a} style={{
                background: "rgba(192,57,43,0.12)", border: "1px solid rgba(192,57,43,0.30)",
                borderRadius: 20, padding: "5px 12px",
                fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.82rem", color: "#c0392b",
              }}>{a.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
            ))}
            {otherText.trim() && (
              <span style={{
                background: "rgba(192,57,43,0.08)", border: "1px dashed rgba(192,57,43,0.30)",
                borderRadius: 20, padding: "5px 12px",
                fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.82rem", color: "rgba(154,80,64,0.80)",
              }}>{otherText}</span>
            )}
            {selectedAllergens.size === 0 && !otherText.trim() && (
              <span style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.82rem", color: "rgba(154,80,64,0.40)" }}>None set, tap Edit Allergies to configure</span>
            )}
          </div>
        )}

        {editingAllergies && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, animation: "slideUp 0.22s ease both" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ALLERGENS_LIST.map(a => {
                const sel = selectedAllergens.has(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleAllergen(a.id)}
                    style={{
                      padding: "8px 14px", borderRadius: 20, cursor: "pointer",
                      fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.84rem",
                      border: sel ? "2px solid #c0392b" : "1.5px solid rgba(192,57,43,0.25)",
                      background: sel ? "rgba(192,57,43,0.14)" : "rgba(255,255,255,0.70)",
                      color: sel ? "#c0392b" : "#5a2810",
                      transition: "all 0.15s ease",
                    }}
                  >{a.label}</button>
                );
              })}
            </div>
            <input
              style={{ ...fieldStyle, fontSize: "0.90rem", padding: "10px 14px" }}
              placeholder="Other allergy (type here)"
              value={otherText}
              onChange={e => setOtherText(e.target.value)}
            />
          </div>
        )}
      </div>

      <button onClick={save} style={{
        width: "100%", padding: "15px", borderRadius: 14, border: "none",
        background: saved ? "#27ae60" : "#c0392b", color: "white",
        fontFamily: "'Fredoka One', cursive", fontSize: "1.10rem",
        cursor: "pointer", marginTop: 4,
        boxShadow: "0 4px 16px rgba(192,57,43,0.28)",
        transition: "background 0.25s ease",
      }}>
        {saved ? "Saved ✓" : saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

// ── Main Settings ─────────────────────────────────────────────────────────────
type SubView = "main" | "editProfile" | "about";

export default function SettingsScreen({ onBack, onLogout, onShowTutorial }: Props) {
  const [view, setView] = useState<SubView>("main");
  const name = localStorage.getItem("cc_user_name") || "there";

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "linear-gradient(160deg,#fff8f5 0%,#fde8e0 55%,#f8d8cc 100%)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "52px 20px 20px",
        display: "flex", alignItems: "center", gap: 14,
        background: "rgba(255,255,255,0.55)",
        borderBottom: "1.5px solid rgba(192,57,43,0.10)",
        flexShrink: 0,
      }}>
        <button onClick={view !== "main" ? () => setView("main") : onBack} style={{
          background: "rgba(192,57,43,0.10)", border: "1.5px solid rgba(192,57,43,0.20)",
          borderRadius: 12, color: "#c0392b", width: 38, height: 38,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: "1.1rem",
        }}>←</button>
        <MushIcon/>
        <div>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.5rem", color: "#3a1810", lineHeight: 1 }}>Settings</div>
          <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.80rem", color: "rgba(154,80,64,0.60)", marginTop: 1 }}>
            Logged in as <strong>{name}</strong>
          </div>
        </div>
      </div>

      {view === "main" && (
        <div style={{
          flex: 1, overflowY: "auto", padding: "20px 20px 40px",
          display: "flex", flexDirection: "column", gap: 10,
          animation: "slideUp 0.4s ease both",
        }}>
          <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.70rem", color: "rgba(154,80,64,0.50)", textTransform: "uppercase", letterSpacing: "0.10em", padding: "0 4px 8px" }}>Help</div>
          <SettingRow
            icon={<IconTutorial/>}
            label="App Tutorial"
            sub="Replay the guided walkthrough"
            onClick={onShowTutorial}
          />
          <SettingRow
            icon={<IconAbout/>}
            label="About CapCare+"
            sub="What we're about and why Cap exists"
            onClick={() => setView("about")}
          />

          <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.70rem", color: "rgba(154,80,64,0.50)", textTransform: "uppercase", letterSpacing: "0.10em", padding: "16px 4px 8px" }}>Account</div>
          <SettingRow
            icon={<IconProfile/>}
            label="Edit Profile"
            sub="Name, age, height, weight, allergies"
            onClick={() => setView("editProfile")}
          />

          <div style={{ marginTop: 12 }}>
            <button onClick={onLogout} style={{
              width: "100%", padding: "16px", borderRadius: 16,
              background: "rgba(192,57,43,0.10)",
              border: "1.5px solid rgba(192,57,43,0.25)",
              color: "#c0392b", fontFamily: "'Fredoka One', cursive",
              fontSize: "1.08rem", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              transition: "background 0.15s ease",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(192,57,43,0.18)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(192,57,43,0.10)"; }}
            >
              <IconLogout/> Log Out
            </button>
          </div>
        </div>
      )}

      {view === "editProfile" && <EditProfileView onBack={() => setView("main")}/>}
      {view === "about"       && <AboutView       onBack={() => setView("main")}/>}
    </div>
  );
}

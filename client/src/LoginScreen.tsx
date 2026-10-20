import React, { useState } from "react";
import { login } from "./api";

interface Props { onBack: () => void; onSuccess: () => void; }

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "14px 18px", borderRadius: 14,
  border: "2px solid rgba(192,57,43,0.22)", outline: "none",
  fontFamily: "'Fredoka One', cursive", fontSize: "1.05rem",
  background: "rgba(255,255,255,0.72)", color: "#3a1810",
  boxSizing: "border-box",
  transition: "border-color 0.18s ease, box-shadow 0.18s ease",
};

function Field({ placeholder, type = "text", value, onChange, error }: {
  placeholder: string; type?: string;
  value: string; onChange: (v: string) => void; error?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <input
        style={{
          ...inputStyle,
          borderColor: error ? "#c0392b" : focused ? "#c0392b" : "rgba(192,57,43,0.22)",
          boxShadow: focused ? "0 0 0 3px rgba(192,57,43,0.12)" : "none",
        }}
        placeholder={placeholder} type={type}
        value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      />
      {error && (
        <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.78rem", color: "#c0392b", marginTop: 5, paddingLeft: 4 }}>{error}</div>
      )}
    </div>
  );
}

// Clean line-icon eye / eye-slash SVG
function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path d="M2 12 C5 6.5 8.5 4 12 4 C15.5 4 19 6.5 22 12 C19 17.5 15.5 20 12 20 C8.5 20 5 17.5 2 12Z"
          stroke="rgba(154,80,64,0.60)" strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="3.2" stroke="rgba(154,80,64,0.60)" strokeWidth="1.5"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path d="M2 12 C5 6.5 8.5 4 12 4 C15.5 4 19 6.5 22 12 C19 17.5 15.5 20 12 20 C8.5 20 5 17.5 2 12Z"
        stroke="rgba(154,80,64,0.60)" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="3.2" stroke="rgba(154,80,64,0.60)" strokeWidth="1.5"/>
      <line x1="4" y1="4" x2="20" y2="20" stroke="rgba(154,80,64,0.60)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function CapCareIcon() {
  return (
    <svg viewBox="0 0 80 72" width="64" height="64" style={{ marginBottom: 6 }}>
      <path d="M8 52 Q7 34 16 22 Q25 12 40 10 Q55 12 64 22 Q73 34 72 52 Q56 58 40 59 Q24 58 8 52Z"
        fill="#c0392b" stroke="#8b1a1a" strokeWidth="2"/>
      <ellipse cx="40" cy="30" rx="10" ry="9" fill="white" opacity="0.9"/>
      <ellipse cx="24" cy="38" rx="7"  ry="6" fill="white" opacity="0.82"/>
      <ellipse cx="57" cy="37" rx="7"  ry="6" fill="white" opacity="0.82"/>
      <path d="M18 54 C17 65 40 68 40 68 C40 68 63 65 62 54 C58 57 40 58 40 58 C40 58 22 57 18 54Z"
        fill="#f0e0c8" stroke="#c9aa7c" strokeWidth="1.5"/>
    </svg>
  );
}

export default function LoginScreen({ onBack, onSuccess }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors,   setErrors  ] = useState({ username: "", password: "" });
  const [busy,     setBusy    ] = useState(false);

  const handleLogin = async () => {
    const errs = {
      username: username.trim() ? "" : "Username is required",
      password: password       ? "" : "Password is required",
    };
    setErrors(errs);
    if (errs.username || errs.password || busy) return;

    setBusy(true);
    try {
      await login(username.trim(), password);
      onSuccess();
    } catch (err: any) {
      setErrors(e => ({ ...e, password: err?.message || "Invalid username or password" }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="size-full flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(160deg,#fff8f5 0%,#fde8e0 55%,#f8d8cc 100%)",
        fontFamily: "'Fredoka One', cursive",
        padding: "0 32px",
      }}
    >
      <div style={{ marginBottom: 36, textAlign: "center", animation: "slideUp 0.55s ease both" }}>
        <CapCareIcon/>
        <div style={{ fontSize: "2.3rem", color: "#c0392b", lineHeight: 1, letterSpacing: "-0.01em" }}>
          CapCare<sup style={{ fontSize: "1.1rem", verticalAlign: "super" }}>+</sup>
        </div>
        <div style={{ fontSize: "1rem", color: "#9a5040", marginTop: 5 }}>Welcome back</div>
      </div>

      <div style={{
        width: "100%", maxWidth: 340,
        display: "flex", flexDirection: "column", gap: 14,
        animation: "slideUp 0.55s 0.08s ease both",
      }}>
        <Field
          placeholder="Username"
          value={username}
          onChange={v => { setUsername(v); setErrors(e => ({ ...e, username: "" })); }}
          error={errors.username}
        />

        <div style={{ position: "relative" }}>
          <Field
            placeholder="Password"
            type={showPass ? "text" : "password"}
            value={password}
            onChange={v => { setPassword(v); setErrors(e => ({ ...e, password: "" })); }}
            error={errors.password}
          />
          <button
            tabIndex={-1}
            onClick={() => setShowPass(p => !p)}
            style={{
              position: "absolute", right: 14,
              top: errors.password ? "calc(50% - 10px)" : "50%",
              transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", padding: 4,
            }}
          >
            <EyeIcon open={showPass}/>
          </button>
        </div>

        <button
          style={{
            width: "100%", padding: "15px", borderRadius: 14, border: "none",
            background: busy ? "rgba(192,57,43,0.55)" : "#c0392b", color: "white",
            fontFamily: "'Fredoka One', cursive", fontSize: "1.15rem",
            cursor: busy ? "default" : "pointer", marginTop: 2,
            boxShadow: "0 4px 16px rgba(192,57,43,0.28)",
            transition: "background 0.15s ease, transform 0.12s ease",
          }}
          onMouseDown={e => { if (!busy) e.currentTarget.style.transform = "scale(0.97)"; }}
          onMouseUp={e => { e.currentTarget.style.transform = ""; handleLogin(); }}
        >
          {busy ? "Logging in…" : "Log In"}
        </button>

        <button
          onClick={onBack}
          style={{
            width: "100%", padding: "13px", borderRadius: 14,
            border: "2px solid rgba(192,57,43,0.28)", background: "transparent",
            color: "#c0392b", fontFamily: "'Fredoka One', cursive",
            fontSize: "1rem", cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

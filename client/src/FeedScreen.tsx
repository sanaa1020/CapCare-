import React, { useEffect, useState } from "react";
import { addNote, deleteNote, listNotes } from "./api";
import notepadIcon    from "./assets/icons/notepad.jpeg";
import microscopeIcon from "./assets/icons/microscope.jpeg";
import cutleryIcon    from "./assets/icons/cutlery.jpeg";
import flowerIcon     from "./assets/icons/flower.jpeg";
import broccoliIcon   from "./assets/icons/broccoli.jpeg";
import syringeIcon    from "./assets/icons/syringe.jpeg";

interface Props { onBack: () => void; firstTime?: boolean; onProfile?: () => void; }

// ── Data ──────────────────────────────────────────────────────────────────────
function getBMI(weight: string, height: string): number | null {
  const w = parseFloat(weight);
  const h = parseFloat(height) / 100;
  if (!w || !h) return null;
  return Math.round((w / (h * h)) * 10) / 10;
}
function bmiLabel(bmi: number): { text: string; color: string } {
  if (bmi < 18.5) return { text: "Underweight", color: "#3498db" };
  if (bmi < 25)   return { text: "Healthy",     color: "#27ae60" };
  if (bmi < 30)   return { text: "Overweight",  color: "#e67e22" };
  return              { text: "Obese",           color: "#c0392b" };
}

interface Article {
  id: number; title: string; tag: string; tagColor: string;
  readTime: string; featured?: boolean; emoji: string; icon?: string;
  body: string;
}

const FEED: Article[] = [
  { id: 1, title: "5 hidden allergens in your snacks", tag: "Allergy", tagColor: "#c0392b", readTime: "3 min", featured: true, emoji: "",
    body: "Allergens hide in plain sight. Barley malt in \"gluten-free\" cereals, milk derivatives in non-dairy spreads, and peanut dust in candy factories. Reading labels is step one; understanding manufacturing practices is step two. Here's what to look for: shared equipment disclosures, \"may contain\" warnings, and the 14 EU major allergens list. Apps like CapCare+ can speed up the scanning, but trained eyes are still your best defence." },
  { id: 2, title: "Reading ingredient labels like a pro", tag: "Education", tagColor: "#8e44ad", readTime: "4 min", emoji: "📋", icon: notepadIcon,
    body: "Ingredients are listed by weight, heaviest first. So if sugar appears third, there's more sugar than whatever comes fourth. Colours and preservatives hide behind E-numbers. Key ones to know: E120 is cochineal (bug-derived), E471 can be dairy or plant-based. When in doubt, look for 'Contains:' declarations in bold. EU and US law requires it for the top 14/9 allergens." },
  { id: 3, title: "Gut microbiome and food sensitivities", tag: "Research", tagColor: "#2980b9", readTime: "6 min", emoji: "🔬", icon: microscopeIcon,
    body: "Your gut microbiome (38 trillion microorganisms) plays a starring role in how your body reacts to certain foods. New research shows that people with a diverse gut flora have fewer food sensitivities. Fermented foods (yoghurt, kimchi, kefir) and fibre-rich diets support diversity. Antibiotics, stress, and ultra-processed foods do the opposite. The gut-brain axis also means your mental state influences digestion, not just the other way around." },
  { id: 4, title: "Managing cross-contamination when eating out", tag: "Tips", tagColor: "#e67e22", readTime: "3 min", emoji: "🍽️", icon: cutleryIcon,
    body: "Ask to speak to the chef, not just the waiter. \"I have a severe allergy\" triggers a different response than \"I avoid that.\" Request clean utensils, a fresh cutting board, and separate prep. Avoid fried foods in shared oil. Watch out for garnishes: that lemon wedge on a fish allergy plate is a real risk. Apps and cards in multiple languages can help when travelling." },
  { id: 5, title: "Seasonal pollen and food allergy overlap", tag: "Health", tagColor: "#27ae60", readTime: "5 min", emoji: "🌸", icon: flowerIcon,
    body: "Oral Allergy Syndrome (OAS) affects up to 70% of birch pollen allergy sufferers. The culprit: cross-reactive proteins between pollen and certain raw foods. Birch → apples, cherries, hazelnuts. Grass → tomatoes, peaches. Ragweed → melons, bananas. Cooking usually destroys the proteins, so the same food eaten cooked causes no reaction. Antihistamines help, but knowing your pollen season is the best predictor of when to be cautious." },
  { id: 6, title: "Plant-based proteins low in common allergens", tag: "Nutrition", tagColor: "#16a085", readTime: "4 min", emoji: "🥦", icon: broccoliIcon,
    body: "Navigating plant proteins with allergies is doable. Quinoa is a complete protein and free of the top 9 allergens. Hemp seeds have all essential amino acids and are rarely allergenic. Pumpkin seeds are packed with zinc and magnesium. Avoid soy if you're soy-allergic (obviously), but also watch for cross-contamination in mixed protein powders. Lentils and chickpeas are legumes, same family as peanuts; some people react to both." },
  { id: 7, title: "When to carry an EpiPen: a practical guide", tag: "Safety", tagColor: "#c0392b", readTime: "7 min", emoji: "💉", icon: syringeIcon,
    body: "If you've ever had anaphylaxis, you should carry two epinephrine auto-injectors at all times. Not one, but two, because roughly 20% of anaphylactic reactions are biphasic (a second wave hits 8-72 hours later). Store them at room temperature; extreme cold or heat degrades the medication. Replace them before the expiry date. Train everyone around you (family, colleagues, teachers) to use it. The pen goes into the outer thigh; it can be administered through clothing." },
];

const DID_YOU_KNOW = [
  { id: 101, fact: "Over 32 million Americans have food allergies: that's 1 in 13 children. You're in good company." },
  { id: 102, fact: "Peanuts are legumes, not true nuts: more closely related to peas and lentils than almonds." },
  { id: 103, fact: "The word 'anaphylaxis' comes from Greek: ana (against) + phylaxis (protection). A poetic way to describe your immune system going a bit too far." },
];

// Sub-components
// Renders an article's uploaded icon image when set, falling back to its emoji.
function ArticleIcon({ article, size }: { article: Article; size: string }) {
  return article.icon ? (
    <img src={article.icon} alt="" style={{ width: size, height: size, objectFit: "contain", display: "block" }}/>
  ) : (
    <span style={{ fontSize: size, display: "block" }}>{article.emoji}</span>
  );
}
function StatTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div style={{ flex: 1, background: "rgba(255,255,255,0.65)", borderRadius: 14, padding: "11px 10px", border: "1px solid rgba(192,57,43,0.12)", minWidth: 0, boxShadow: "0 2px 10px rgba(192,57,43,0.08)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.74rem", color: "rgba(154,80,64,0.55)", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.12rem", color: accent, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.62rem", color: "rgba(154,80,64,0.55)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function FeaturedCard({ a, onTap }: { a: Article; onTap: () => void }) {
  return (
    <div onClick={onTap} style={{ borderRadius: 20, cursor: "pointer", background: "linear-gradient(135deg, rgba(192,57,43,0.12) 0%, rgba(220,120,60,0.10) 100%)", border: "1.5px solid rgba(192,57,43,0.22)", padding: "22px 20px 18px", boxShadow: "0 4px 20px rgba(192,57,43,0.10)" }}>
      <div style={{ marginBottom: 10 }}><ArticleIcon article={a} size="5rem"/></div>
      <span style={{ background: a.tagColor, color: "white", fontFamily: "'Fredoka One', cursive", fontSize: "0.70rem", padding: "3px 11px", borderRadius: 20, display: "inline-block", marginBottom: 10 }}>{a.tag}</span>
      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.22rem", color: "#3a1810", lineHeight: 1.38, marginBottom: 8 }}>{a.title}</div>
      <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.76rem", color: "rgba(154,80,64,0.55)" }}>{a.readTime} read · Featured</div>
    </div>
  );
}

function GridCard({ a, onTap }: { a: Article; onTap: () => void }) {
  return (
    <div onClick={onTap} style={{ borderRadius: 16, cursor: "pointer", padding: "16px 14px", background: "rgba(255,255,255,0.65)", border: "1px solid rgba(192,57,43,0.12)", display: "flex", flexDirection: "column", gap: 8, minHeight: 148, boxShadow: "0 2px 12px rgba(192,57,43,0.07)" }}>
      <ArticleIcon article={a} size="4rem"/>
      <span style={{ background: a.tagColor + "22", color: a.tagColor, fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.65rem", fontWeight: 500, padding: "2px 9px", borderRadius: 20, display: "inline-block", alignSelf: "flex-start" }}>{a.tag}</span>
      <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontWeight: 500, fontSize: "0.88rem", color: "#3a1810", lineHeight: 1.38, flex: 1 }}>{a.title}</div>
      <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.68rem", color: "rgba(154,80,64,0.45)" }}>{a.readTime} read</div>
    </div>
  );
}

function DidYouKnowCard({ fact, onTap }: { fact: string; onTap: () => void }) {
  return (
    <div onClick={onTap} style={{ borderRadius: 18, padding: "18px 18px", background: "linear-gradient(135deg, rgba(192,57,43,0.12) 0%, rgba(230,130,30,0.10) 100%)", border: "1.5px solid rgba(192,57,43,0.22)", display: "flex", gap: 14, alignItems: "flex-start", cursor: "pointer" }}>
      <svg viewBox="0 0 24 24" width="28" height="28" style={{ flexShrink: 0, marginTop: 2 }}>
        <path d="M4 16 Q3 10 6 6 Q9 3 12 3 Q15 3 18 6 Q21 10 20 16 Q17 18 12 19 Q7 18 4 16Z" fill="#c0392b" opacity="1" stroke="#c0392b" strokeWidth="1"/>
        <ellipse cx="12" cy="9" rx="2" ry="1.8" fill="white" opacity="0.7"/>
        <path d="M5 16 C5 21 12 23 12 23 C12 23 19 21 19 16" fill="#f0d8b8" stroke="rgba(192,57,43,0.25)" strokeWidth="0.8"/>
      </svg>
      <div>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "0.78rem", color: "#c0392b", letterSpacing: "0.08em", marginBottom: 5 }}>DID YOU KNOW?</div>
        <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.90rem", color: "#5a2810", lineHeight: 1.52 }}>{fact}</div>
        <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.72rem", color: "rgba(154,80,64,0.50)", marginTop: 6 }}>Tap to learn more →</div>
      </div>
    </div>
  );
}

// ── Article detail view ───────────────────────────────────────────────────────
function ArticleView({ article, onBack }: { article: Article; onBack: () => void }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 48px", animation: "slideUp 0.32s ease both" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.88rem", color: "#c0392b", padding: "16px 0 10px", display: "flex", alignItems: "center", gap: 4 }}>← Back to Home</button>
      {/* Header card */}
      <div style={{ borderRadius: 22, background: "linear-gradient(135deg, rgba(192,57,43,0.14) 0%, rgba(220,120,60,0.10) 100%)", border: "1.5px solid rgba(192,57,43,0.22)", padding: "24px 22px 20px", marginBottom: 20 }}>
        <div style={{ marginBottom: 12 }}><ArticleIcon article={article} size="6rem"/></div>
        <span style={{ background: article.tagColor, color: "white", fontFamily: "'Fredoka One', cursive", fontSize: "0.72rem", padding: "4px 12px", borderRadius: 20, display: "inline-block", marginBottom: 12 }}>{article.tag}</span>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.4rem", color: "#3a1810", lineHeight: 1.3, marginBottom: 8 }}>{article.title}</div>
        {/* Mushroom "by-line" */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg viewBox="0 0 20 18" width="20" height="18">
            <path d="M2 12 Q2 7 5 4 Q8 2 10 2 Q12 2 15 4 Q18 7 18 12 Q14 13.5 10 14 Q6 13.5 2 12Z" fill="#c0392b" opacity="0.65"/>
            <ellipse cx="10" cy="7" rx="2" ry="1.8" fill="white" opacity="0.85"/>
          </svg>
          <span style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.76rem", color: "rgba(154,80,64,0.60)" }}>Cap · CapCare+ Health · {article.readTime} read</span>
        </div>
      </div>
      {/* Body */}
      <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: "1.0rem", color: "#3a1810", lineHeight: 1.80 }}>
        {article.body}
      </div>
    </div>
  );
}

// ── Shared small trash icon ──────────────────────────────────────────────────
function TrashIcon() {
  return (
    <svg viewBox="0 0 18 20" width="14" height="16" fill="none" style={{ display: "block" }}>
      <path d="M1.5 5 H16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M6.5 5 V3 H11.5 V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.5 5 L3.5 17 H14.5 L15.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 9 V14 M11 9 V14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

// Personal notes: per-account, timestamped entries, backed by SQLite
interface NoteEntry { id?: number; text: string; ts: string; }

function loadLocalNotes(): NoteEntry[] {
  const user = localStorage.getItem("cc_user_name") || "default";
  try { return JSON.parse(localStorage.getItem(`cc_notes_${user}`) || "[]"); }
  catch { return []; }
}
function saveLocalNotes(entries: NoteEntry[]) {
  const user = localStorage.getItem("cc_user_name") || "default";
  localStorage.setItem(`cc_notes_${user}`, JSON.stringify(entries));
}

function NotesView({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<NoteEntry[]>(loadLocalNotes);
  const [draft,   setDraft  ] = useState("");

  useEffect(() => {
    listNotes()
      .then(fetched => { setEntries(fetched); saveLocalNotes(fetched); })
      .catch(() => { /* offline, keep local cache */ });
  }, []);

  const addNoteEntry = () => {
    if (!draft.trim()) return;
    const optimistic: NoteEntry = {
      text: draft.trim(),
      ts: new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    };
    setEntries(prev => {
      const next = [optimistic, ...prev];
      saveLocalNotes(next);
      return next;
    });
    setDraft("");

    addNote(optimistic.text)
      .then(saved => {
        setEntries(prev => {
          const next = prev.map(e => (e === optimistic ? saved : e));
          saveLocalNotes(next);
          return next;
        });
      })
      .catch(() => { /* stays local-only until back online */ });
  };

  const deleteNoteEntry = (idx: number) => {
    const target = entries[idx];
    setEntries(prev => {
      const next = prev.filter((_, i) => i !== idx);
      saveLocalNotes(next);
      return next;
    });
    if (target?.id != null) deleteNote(target.id).catch(() => {});
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 40px", display: "flex", flexDirection: "column", gap: 12, animation: "slideUp 0.32s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 4px" }}>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.4rem", color: "#3a1810" }}>Personal Notes</div>
        <button onClick={onClose} style={{ background: "rgba(192,57,43,0.10)", border: "1px solid rgba(192,57,43,0.20)", borderRadius: 10, padding: "6px 14px", cursor: "pointer", fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.82rem", color: "#c0392b" }}>Done</button>
      </div>

      {/* Add note area */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Add a note: medical history, observations, anything you want to remember…"
          style={{
            minHeight: 90, padding: "12px 14px", borderRadius: 14,
            border: "2px solid rgba(192,57,43,0.20)", outline: "none",
            fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.90rem",
            color: "#3a1810", lineHeight: 1.6, resize: "none",
            background: "rgba(255,255,255,0.80)",
          }}
        />
        <button onClick={addNoteEntry} style={{
          width: "100%", padding: "12px", borderRadius: 13, border: "none",
          background: draft.trim() ? "#c0392b" : "rgba(192,57,43,0.28)",
          color: "white", fontFamily: "'Fredoka One', cursive", fontSize: "1.0rem",
          cursor: draft.trim() ? "pointer" : "default",
          transition: "background 0.2s ease",
        }}>+ Add Note</button>
      </div>

      {/* Existing entries */}
      {entries.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 20, fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.86rem", color: "rgba(154,80,64,0.38)", lineHeight: 1.6 }}>
          No notes yet. Your notes are private to your account.
        </div>
      ) : entries.map((e, i) => (
        <div key={i} style={{
          borderRadius: 14, padding: "14px 16px",
          background: "rgba(255,255,255,0.72)",
          border: "1px solid rgba(192,57,43,0.12)",
          animation: `slideUp 0.25s ease ${i * 0.04}s both`,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.90rem", color: "#3a1810", lineHeight: 1.6, flex: 1 }}>{e.text}</div>
            <button onClick={() => deleteNoteEntry(i)} style={{
              background: "none", border: "none", cursor: "pointer", padding: "3px 4px",
              color: "rgba(154,80,64,0.32)", flexShrink: 0,
            }}><TrashIcon/></button>
          </div>
          <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.70rem", color: "rgba(154,80,64,0.45)", marginTop: 6 }}>{e.ts}</div>
        </div>
      ))}
    </div>
  );
}

// ── Mushroom node for branch tree ─────────────────────────────────────────────
function MushNode({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 26 24" width="26" height="24" style={{ display: "block", flexShrink: 0 }}>
      <rect x="9.5" y="15" width="7" height="8" rx="2.2"
        fill={active ? "#e8d8c0" : "rgba(232,216,192,0.55)"}
        stroke={active ? "#c9aa7c" : "rgba(201,170,124,0.38)"} strokeWidth="0.9"/>
      <path d="M3.5 14 Q13 17 22.5 14" fill="none"
        stroke={active ? "#8b1a1a" : "rgba(139,26,26,0.35)"} strokeWidth="1" strokeLinecap="round"/>
      <path d="M3.5 14 Q2 9.5 5 6.5 Q7.5 4 13 3.5 Q18.5 4 21 6.5 Q24 9.5 22.5 14 Q18 15.5 13 16 Q8 15.5 3.5 14Z"
        fill={active ? "#c0392b" : "rgba(192,57,43,0.46)"}
        stroke={active ? "#8b1a1a" : "rgba(139,26,26,0.36)"} strokeWidth="1"/>
      <path d="M6 7.5 Q9.5 5 13 4.5 Q16.5 5 20 7.5"
        stroke="rgba(255,255,255,0.30)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <ellipse cx="13" cy="9" rx="3.2" ry="2.9" fill="white" opacity="0.80"/>
    </svg>
  );
}

// History report: mushroom-forest branch tree
function TreeChart({ onClose }: { onClose: () => void }) {
  interface LogEntry { label: string; cat: string; date: string; time?: string; }
  const log: LogEntry[] = (() => {
    try { return JSON.parse(localStorage.getItem("cc_symptom_log") || "[]"); }
    catch { return []; }
  })();

  const grouped = log.reduce<Record<string, LogEntry[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {});
  const days = Object.entries(grouped).slice(0, 14);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (date: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 40px", animation: "slideUp 0.32s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 14px" }}>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.4rem", color: "#3a1810" }}>History</div>
        <button onClick={onClose} style={{ background: "rgba(192,57,43,0.10)", border: "1px solid rgba(192,57,43,0.20)", borderRadius: 10, padding: "6px 14px", cursor: "pointer", fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.82rem", color: "#c0392b" }}>Close</button>
      </div>

      {days.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 40, fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.88rem", color: "rgba(154,80,64,0.40)" }}>
          No logged history yet, start logging in Symptom Tracker!
        </div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 52 }}>
          {/* Vertical trunk */}
          <div style={{
            position: "absolute", left: 19, top: 6, bottom: 6, width: 4,
            background: "linear-gradient(to bottom, #c0392b 0%, rgba(100,15,15,0.40) 100%)",
            borderRadius: 2,
          }}/>

          {days.map(([date, entries], di) => {
            const open = expanded.has(date);
            return (
              <div key={date} style={{
                position: "relative", marginBottom: 10,
                animation: `slideUp 0.24s ease ${di * 0.04}s both`,
              }}>
                {/* Branch arm + mushroom node */}
                <div style={{
                  position: "absolute", left: -52, top: 13,
                  display: "flex", alignItems: "center", width: 52,
                }}>
                  <div style={{
                    flex: 1, height: 2, marginLeft: 21,
                    background: open ? "rgba(192,57,43,0.65)" : "rgba(192,57,43,0.24)",
                    transition: "background 0.18s ease",
                  }}/>
                  <MushNode active={open}/>
                </div>

                {/* Day card */}
                <button
                  onClick={() => toggle(date)}
                  style={{
                    width: "100%", padding: "11px 14px", border: "none", cursor: "pointer",
                    borderRadius: 14, textAlign: "left",
                    background: open ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.65)",
                    outline: `1.5px solid ${open ? "rgba(192,57,43,0.28)" : "rgba(192,57,43,0.11)"}`,
                    display: "flex", alignItems: "center", gap: 10,
                    boxShadow: open ? "0 4px 18px rgba(192,57,43,0.11)" : "none",
                    transition: "background 0.18s ease, box-shadow 0.18s ease",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.0rem", color: "#3a1810" }}>{date}</div>
                    <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.72rem", color: "rgba(154,80,64,0.52)", marginTop: 1 }}>
                      {entries.length} entr{entries.length === 1 ? "y" : "ies"}
                    </div>
                  </div>
                  {!open && (
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {entries.slice(0, 2).map((e, ei) => (
                        <span key={ei} style={{
                          background: "rgba(192,57,43,0.09)", border: "1px solid rgba(192,57,43,0.18)",
                          borderRadius: 20, padding: "2px 8px",
                          fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.65rem", color: "#c0392b",
                          maxWidth: 58, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{e.label.length > 7 ? e.label.slice(0, 6) + "…" : e.label}</span>
                      ))}
                      {entries.length > 2 && (
                        <span style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.65rem", color: "rgba(154,80,64,0.48)", alignSelf: "center" }}>+{entries.length - 2}</span>
                      )}
                    </div>
                  )}
                  <div style={{
                    width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                    background: open ? "#c0392b" : "rgba(192,57,43,0.11)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.18s ease",
                  }}>
                    <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.0rem", color: open ? "white" : "#c0392b", lineHeight: 1, marginTop: -1 }}>
                      {open ? "−" : "+"}
                    </span>
                  </div>
                </button>

                {/* Expanded entries */}
                {open && (
                  <div style={{
                    marginTop: 5, paddingLeft: 2,
                    display: "flex", flexDirection: "column", gap: 5,
                    animation: "slideUp 0.18s ease both",
                  }}>
                    {entries.map((e, ei) => (
                      <div key={ei} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px", borderRadius: 10,
                        background: e.cat === "symptoms" ? "rgba(192,57,43,0.07)" : "rgba(192,57,43,0.03)",
                        border: "1px solid rgba(192,57,43,0.10)",
                      }}>
                        {/* Mini mushroom bullet */}
                        <svg viewBox="0 0 10 9" width="9" height="8" style={{ flexShrink: 0 }}>
                          <path d="M1 7 Q1 4 2.5 2.5 Q4 1 5 1 Q6 1 7.5 2.5 Q9 4 9 7 Q7 7.8 5 8 Q3 7.8 1 7Z"
                            fill="#c0392b" opacity="0.52"/>
                        </svg>
                        <div style={{ flex: 1, fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.85rem", color: "#3a1810" }}>{e.label}</div>
                        <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.68rem", color: "rgba(154,80,64,0.44)", flexShrink: 0 }}>
                          {e.cat}{e.time ? ` · ${e.time}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Latest insight ────────────────────────────────────────────────────────────
function LatestInsight() {
  interface LogEntry { label: string; cat: string; date: string; }
  const log: LogEntry[] = (() => {
    try { return JSON.parse(localStorage.getItem("cc_symptom_log") || "[]"); }
    catch { return []; }
  })();

  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const todayCount = log.filter(e => e.date === today).length;
  const totalDays  = new Set(log.map(e => e.date)).size;

  let message = "Start logging today. Cap's watching over you.";
  let tone: "neutral" | "good" | "great" = "neutral";

  if (todayCount >= 3) { message = "Great logging today! You've tracked " + todayCount + " entries."; tone = "great"; }
  else if (totalDays >= 3) { message = "You're building good habits! " + totalDays + " days of data so far."; tone = "good"; }
  else if (todayCount === 1) { message = "Good start today, keep it up!"; tone = "good"; }

  const colors = { neutral: "#9a5040", good: "#27ae60", great: "#c0392b" };

  return (
    <div style={{
      borderRadius: 16, padding: "14px 18px",
      background: "rgba(255,255,255,0.65)",
      border: `1.5px solid rgba(192,57,43,0.14)`,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <svg viewBox="0 0 24 24" width="28" height="28" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" fill={colors[tone]} opacity="0.15"/>
        <path d="M7 14 Q9 10 12 9 Q15 10 17 14" stroke={colors[tone]} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <circle cx="12" cy="7" r="2" fill={colors[tone]} opacity="0.7"/>
      </svg>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "0.85rem", color: colors[tone] }}>Latest Insight</div>
        <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.88rem", color: "#3a1810", marginTop: 2, lineHeight: 1.45 }}>{message}</div>
      </div>
    </div>
  );
}

// ── Profile avatar button ─────────────────────────────────────────────────────
function ProfileAvatar({ name, onPress }: { name: string; onPress?: () => void }) {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <button
      onClick={onPress}
      style={{
        width: 42, height: 42, borderRadius: "50%",
        background: "linear-gradient(135deg, #c0392b 0%, #e04030 100%)",
        border: "2.5px solid rgba(255,255,255,0.70)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: onPress ? "pointer" : "default", flexShrink: 0,
        boxShadow: "0 3px 14px rgba(192,57,43,0.30)",
      }}
    >
      <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: "0.95rem", color: "white", letterSpacing: "0.02em" }}>{initials || "?"}</span>
    </button>
  );
}

// ── Main FeedScreen ───────────────────────────────────────────────────────────
type MainView = "feed" | "article" | "tree" | "notes";

export default function FeedScreen({ onBack, firstTime, onProfile }: Props) {
  const [view, setView] = useState<MainView>("feed");
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [dykIndex] = useState(0); // Only show 1 DYK at a time

  const name   = localStorage.getItem("cc_user_name") || "there";
  const weight = localStorage.getItem("cc_weight") || "";
  const height = localStorage.getItem("cc_height") || "";
  const age    = localStorage.getItem("cc_age")    || "";
  const bmi    = getBMI(weight, height);

  // Item 4: dynamic greeting
  const greeting = firstTime ? `Welcome, ${name}` : `Welcome back, ${name}`;

  const featured = FEED.find(a => a.featured) ?? FEED[0];
  const grid     = FEED.filter(a => a.id !== featured?.id);
  const dyk      = DID_YOU_KNOW[dykIndex % DID_YOU_KNOW.length];

  const openArticle = (a: Article) => { setActiveArticle(a); setView("article"); };
  const openDyk = () => { setActiveArticle({ ...{ id: 0, title: "Did You Know?", tag: "Fun Fact", tagColor: "#c0392b", readTime: "1 min", emoji: "🍄", body: dyk.fact + "\n\nFood allergy facts like these are the start of better understanding your own body. The more you know, the better you can advocate for yourself at restaurants, with family, and in daily life. Keep exploring with CapCare+!" } }); setView("article"); };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "linear-gradient(160deg,#f5e8e0 0%,#f0d0c0 55%,#e8b8a8 100%)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Article view */}
      {view === "article" && activeArticle && (
        <>
          <div style={{ padding: "52px 20px 0", flexShrink: 0, borderBottom: "1px solid rgba(192,57,43,0.10)" }}>
            <div style={{ fontFamily: "'Montserrat', Helvetica, sans-serif", fontWeight: 700, fontSize: "1.3rem", color: "#3a1810" }}>CapCare+ Reads</div>
          </div>
          <ArticleView article={activeArticle} onBack={() => setView("feed")}/>
        </>
      )}

      {/* Tree chart */}
      {view === "tree" && (
        <>
          <div style={{ padding: "52px 20px 0", flexShrink: 0, borderBottom: "1px solid rgba(192,57,43,0.10)", paddingBottom: 12 }}>
            <div style={{ fontFamily: "'Montserrat', Helvetica, sans-serif", fontWeight: 700, fontSize: "1.3rem", color: "#3a1810" }}>Health Reports</div>
          </div>
          <TreeChart onClose={() => setView("feed")}/>
        </>
      )}

      {/* Notes */}
      {view === "notes" && (
        <>
          <div style={{ padding: "52px 20px 0", flexShrink: 0, borderBottom: "1px solid rgba(192,57,43,0.10)", paddingBottom: 12 }}>
            <div style={{ fontFamily: "'Montserrat', Helvetica, sans-serif", fontWeight: 700, fontSize: "1.3rem", color: "#3a1810" }}>CapCare+ Home</div>
          </div>
          <NotesView onClose={() => setView("feed")}/>
        </>
      )}

      {/* Main feed: the whole page scrolls as one column instead of just the grid at the bottom */}
      {view === "feed" && (
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div style={{ padding: "52px 20px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "'Montserrat', Helvetica, sans-serif", fontWeight: 700, fontSize: "1.7rem", color: "#3a1810", lineHeight: 1.1 }}>{greeting}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
              <button onClick={onBack} style={{ background: "rgba(192,57,43,0.10)", border: "1.5px solid rgba(192,57,43,0.22)", borderRadius: 12, color: "#c0392b", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1.1rem", flexShrink: 0 }}>←</button>
              <ProfileAvatar name={name} onPress={onProfile}/>
            </div>
          </div>

          {/* Stat tiles */}
          {(bmi || age || height || weight) ? (
            <div style={{ display: "flex", gap: 8, padding: "14px 20px 0", flexShrink: 0 }}>
              {bmi && (() => { const { text } = bmiLabel(bmi); return <StatTile key="bmi" label="BMI" value={String(bmi)} sub={text} accent="#9a7060"/>; })()}
              {age    && <StatTile key="age"    label="Age"    value={age}           sub="years" accent="#9a7060"/>}
              {height && <StatTile key="ht"     label="Height" value={height}         sub="cm"   accent="#9a7060"/>}
              {weight && <StatTile key="wt"     label="Weight" value={weight}         sub="kg"   accent="#9a7060"/>}
            </div>
          ) : null}

          {/* Latest insight (item 22) */}
          <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
            <LatestInsight/>
          </div>

          {/* Quick actions row */}
          <div style={{ display: "flex", gap: 8, padding: "12px 20px 0", flexShrink: 0 }}>
            <button onClick={() => setView("tree")} style={{ flex: 1, padding: "10px", borderRadius: 14, border: "1.5px solid rgba(192,57,43,0.20)", background: "rgba(255,255,255,0.65)", cursor: "pointer", fontFamily: "'Fredoka One', cursive", fontSize: "0.88rem", color: "#c0392b" }}>
              Show History
            </button>
            <button onClick={() => setView("notes")} style={{ flex: 1, padding: "10px", borderRadius: 14, border: "1.5px solid rgba(192,57,43,0.20)", background: "rgba(255,255,255,0.65)", cursor: "pointer", fontFamily: "'Fredoka One', cursive", fontSize: "0.88rem", color: "#c0392b" }}>
              My Notes
            </button>
          </div>

          {/* Feed */}
          <div style={{ padding: "14px 20px 48px", display: "flex", flexDirection: "column", gap: 14, animation: "slideUp 0.42s ease both" }}>
            {featured && <FeaturedCard a={featured} onTap={() => openArticle(featured)}/>}

            {/* Exactly 1 DYK card (item 19) */}
            <DidYouKnowCard fact={dyk.fact} onTap={openDyk}/>

            {/* Grid */}
            {Array.from({ length: Math.ceil(grid.length / 2) }).map((_, pi) => (
              <div key={pi} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {grid.slice(pi * 2, pi * 2 + 2).map(a => <GridCard key={a.id} a={a} onTap={() => openArticle(a)}/>)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

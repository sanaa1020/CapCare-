import { Component, useEffect, useState, type ReactNode } from "react";
import { listNews, listRecalls, listAlerts, type NewsArticle, type FoodRecall, type HealthAlert } from "./api";

interface Props { onBack: () => void; }

// Fetches `fetchFn` on mount, then re-polls every `intervalMs` while the
// caller stays mounted, so News/Recalls/Alerts all keep themselves current
// without the boilerplate repeated three times over. A failed background
// poll just keeps whatever was last shown instead of clearing the list.
// Guards against a malformed (non-array) response ever reaching state, since
// that would crash `.slice()`/`.map()` further down and take the whole
// screen with it.
function usePolledFeed<T>(fetchFn: () => Promise<T[]>, intervalMs: number) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = (isInitial: boolean) => {
      if (isInitial) setLoading(true);
      fetchFn()
        .then(a => { if (!cancelled) setItems(Array.isArray(a) ? a : []); })
        .catch(() => { if (!cancelled && isInitial) setItems([]); })
        .finally(() => { if (!cancelled && isInitial) setLoading(false); });
    };
    refresh(true);
    const id = setInterval(() => refresh(false), intervalMs);
    return () => { cancelled = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { items, loading };
}

// If a single section's box throws while rendering (bad/unexpected data
// shape from a given source), this keeps the crash contained to that one
// box instead of unmounting the whole screen, so the tabs above stay put
// and switching sections still works.
class SectionErrorBoundary extends Component<{ label: string; children: ReactNode }, { hasError: boolean }> {
  constructor(props: { label: string; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidUpdate(prevProps: { label: string }) {
    if (prevProps.label !== this.props.label && this.state.hasError) this.setState({ hasError: false });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ borderRadius: 18, padding: "16px 18px", background: "rgba(154,80,64,0.08)", border: "1.5px solid rgba(154,80,64,0.20)" }}>
          <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.85rem", color: "rgba(90,40,16,0.65)" }}>
            Couldn't show {this.props.label} right now. Try another tab, or come back later.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Small "matches your allergens" pill, shared by the news and recalls boxes.
function RelevanceTag({ tags, color }: { tags: string[]; color: string }) {
  if (!tags.length) return null;
  const label = tags.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(", ");
  return (
    <span style={{
      display: "inline-block", marginTop: 4, padding: "2px 8px", borderRadius: 20,
      background: color + "1a", color, border: `1px solid ${color}40`,
      fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.62rem", fontWeight: 500,
    }}>Relevant to you: {label}</span>
  );
}

// Shared shape for the in-app reading view opened from any of the three
// News/Recalls/Alerts boxes below, normalized so one detail view (see
// FeedItemView) can render any of them the same way an article opens.
interface FeedItemDetail {
  title: string; source: string; pubDate: string; summary?: string;
  link: string; badge: string; color: string;
}

// Health News box: general headlines ranked by relevance to the user's
// allergens (server-side).
function NewsBox({ articles, loading, onOpen }: { articles: NewsArticle[]; loading: boolean; onOpen: (d: FeedItemDetail) => void }) {
  const shown = (Array.isArray(articles) ? articles : []).slice(0, 6);
  return (
    <div style={{ borderRadius: 18, padding: "16px 18px", background: "rgba(255,255,255,0.65)", border: "1.5px solid rgba(192,57,43,0.16)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <svg viewBox="0 0 24 24" width="20" height="20">
          <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="#c0392b" strokeWidth="1.5"/>
          <path d="M7 9 H17 M7 13 H17 M7 17 H13" stroke="#c0392b" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.0rem", color: "#c0392b" }}>Health News</div>
      </div>

      {loading ? (
        <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.85rem", color: "rgba(154,80,64,0.55)" }}>
          Loading latest headlines…
        </div>
      ) : shown.length === 0 ? (
        <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.85rem", color: "rgba(154,80,64,0.45)" }}>
          No news available right now.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {shown.map((a, i) => (
            <button
              key={a.id || i}
              onClick={() => onOpen({ title: a.title, source: a.source, pubDate: a.pubDate, summary: a.summary, link: a.link, badge: "News", color: "#c0392b" })}
              style={{
                display: "block", textAlign: "left", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0,
                paddingBottom: i < shown.length - 1 ? 10 : 0,
                borderBottom: i < shown.length - 1 ? "1px solid rgba(192,57,43,0.10)" : "none",
              }}
            >
              <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontWeight: 500, fontSize: "0.86rem", color: "#3a1810", lineHeight: 1.4 }}>{a.title}</div>
              <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.70rem", color: "rgba(154,80,64,0.50)", marginTop: 3 }}>
                {a.source}{a.pubDate ? ` · ${new Date(a.pubDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
              </div>
              <RelevanceTag tags={a.tags} color="#c0392b"/>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Official Recalls box: openFDA structured data, a different trust tier from
// press coverage, so it's visually distinct (urgent amber styling) and kept
// separate from the general news list.
function RecallsBox({ recalls, loading, onOpen }: { recalls: FoodRecall[]; loading: boolean; onOpen: (d: FeedItemDetail) => void }) {
  const shown = (Array.isArray(recalls) ? recalls : []).slice(0, 5);
  return (
    <div style={{ borderRadius: 18, padding: "16px 18px", background: "rgba(230,126,34,0.08)", border: "1.5px solid rgba(230,126,34,0.30)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path d="M12 3 L22 20 H2 Z" fill="none" stroke="#c0651c" strokeWidth="1.6" strokeLinejoin="round"/>
          <path d="M12 9 V14 M12 17 V17.2" stroke="#c0651c" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.0rem", color: "#c0651c" }}>Official Recalls</div>
        <span style={{ marginLeft: "auto", fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.62rem", color: "rgba(192,101,28,0.55)" }}>FDA</span>
      </div>

      {loading ? (
        <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.85rem", color: "rgba(192,101,28,0.60)" }}>Loading recalls…</div>
      ) : shown.length === 0 ? (
        <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.85rem", color: "rgba(192,101,28,0.50)" }}>
          No recalls available right now.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {shown.map((r, i) => (
            <button
              key={r.id || i}
              onClick={() => onOpen({ title: r.title, source: r.source, pubDate: r.pubDate, summary: r.summary, link: r.link, badge: r.classification || "Recall", color: "#c0651c" })}
              style={{
                display: "block", textAlign: "left", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0,
                paddingBottom: i < shown.length - 1 ? 10 : 0,
                borderBottom: i < shown.length - 1 ? "1px solid rgba(230,126,34,0.14)" : "none",
              }}
            >
              <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontWeight: 500, fontSize: "0.86rem", color: "#7a3d10", lineHeight: 1.4 }}>{r.title}</div>
              {r.summary && (
                <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.74rem", color: "rgba(122,61,16,0.65)", marginTop: 2, lineHeight: 1.4 }}>{r.summary}</div>
              )}
              <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.68rem", color: "rgba(192,101,28,0.55)", marginTop: 3 }}>
                {r.classification || "Recall"}{r.pubDate ? ` · ${r.pubDate}` : ""}
              </div>
              <RelevanceTag tags={r.tags} color="#c0651c"/>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Health Alerts box: CDC outbreak/health-alert headlines. Not personalized
// (these are broad public-health notices), styled distinctly from both News
// and Recalls so its "authoritative government source" tier reads clearly.
function AlertsBox({ alerts, loading, onOpen }: { alerts: HealthAlert[]; loading: boolean; onOpen: (d: FeedItemDetail) => void }) {
  const shown = (Array.isArray(alerts) ? alerts : []).slice(0, 4);
  return (
    <div style={{ borderRadius: 18, padding: "16px 18px", background: "rgba(41,128,185,0.07)", border: "1.5px solid rgba(41,128,185,0.26)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <svg viewBox="0 0 24 24" width="20" height="20">
          <circle cx="12" cy="12" r="9" fill="none" stroke="#2980b9" strokeWidth="1.6"/>
          <path d="M12 8 V13 M12 15.5 V15.7" stroke="#2980b9" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.0rem", color: "#2980b9" }}>Health Alerts</div>
        <span style={{ marginLeft: "auto", fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.62rem", color: "rgba(41,128,185,0.55)" }}>CDC</span>
      </div>

      {loading ? (
        <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.85rem", color: "rgba(41,128,185,0.60)" }}>Loading alerts…</div>
      ) : shown.length === 0 ? (
        <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.85rem", color: "rgba(41,128,185,0.50)" }}>
          No alerts available right now.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {shown.map((a, i) => (
            <button
              key={a.id || i}
              onClick={() => onOpen({ title: a.title, source: a.source, pubDate: a.pubDate, summary: a.summary, link: a.link, badge: "Health Alert", color: "#2980b9" })}
              style={{
                display: "block", textAlign: "left", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0,
                paddingBottom: i < shown.length - 1 ? 10 : 0,
                borderBottom: i < shown.length - 1 ? "1px solid rgba(41,128,185,0.12)" : "none",
              }}
            >
              <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontWeight: 500, fontSize: "0.86rem", color: "#1a4a68", lineHeight: 1.4 }}>{a.title}</div>
              <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.70rem", color: "rgba(41,128,185,0.55)", marginTop: 3 }}>
                {a.source}{a.pubDate ? ` · ${new Date(a.pubDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// In-app reading view for a News/Recalls/Alerts item, styled the same way as
// an article detail view: header card with a colored badge, then the body.
// Since these external items only carry a short summary (not the full
// article), it ends with a "Read full article" link out to the source.
function FeedItemView({ item, onBack }: { item: FeedItemDetail; onBack: () => void }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 48px", animation: "slideUp 0.32s ease both" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.88rem", color: item.color, padding: "16px 0 10px", display: "flex", alignItems: "center", gap: 4 }}>← Back</button>
      <div style={{ borderRadius: 22, background: `${item.color}14`, border: `1.5px solid ${item.color}38`, padding: "24px 22px 20px", marginBottom: 20 }}>
        <span style={{ background: item.color, color: "white", fontFamily: "'Fredoka One', cursive", fontSize: "0.72rem", padding: "4px 12px", borderRadius: 20, display: "inline-block", marginBottom: 12 }}>{item.badge}</span>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.3rem", color: "#3a1810", lineHeight: 1.3, marginBottom: 8 }}>{item.title}</div>
        <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.76rem", color: "rgba(154,80,64,0.60)" }}>
          {item.source}{item.pubDate ? ` · ${item.pubDate.length > 10 ? new Date(item.pubDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : item.pubDate}` : ""}
        </div>
      </div>
      <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: "1.0rem", color: "#3a1810", lineHeight: 1.80, marginBottom: 20 }}>
        {item.summary || "No summary available for this item."}
      </div>
      <a href={item.link} target="_blank" rel="noreferrer" style={{
        display: "inline-block", padding: "11px 20px", borderRadius: 14,
        background: item.color, color: "white", textDecoration: "none",
        fontFamily: "'Fredoka One', cursive", fontSize: "0.90rem",
      }}>Read full article →</a>
    </div>
  );
}

const NEWS_SECTIONS = [
  { id: "news",    label: "News",    color: "#c0392b" },
  { id: "recalls", label: "Recalls", color: "#c0651c" },
  { id: "alerts",  label: "Alerts",  color: "#2980b9" },
] as const;

// Same pill styling as the app's other category tabs: auto-width, Outfit
// font, solid red when active. Only the selected section's box is shown.
function NewsSectionTabs({ active, onSelect }: { active: string; onSelect: (id: typeof NEWS_SECTIONS[number]["id"]) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
      {NEWS_SECTIONS.map(s => {
        const isActive = active === s.id;
        return (
          <button key={s.id} onClick={() => onSelect(s.id)} style={{
            background: isActive ? "#c0392b" : "rgba(192,57,43,0.08)",
            border: isActive ? "none" : "1px solid rgba(192,57,43,0.15)",
            borderRadius: 20, padding: "7px 18px", cursor: "pointer",
            fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.80rem",
            fontWeight: isActive ? 500 : 400,
            color: isActive ? "white" : "rgba(154,80,64,0.70)",
            whiteSpace: "nowrap", transition: "background 0.2s ease, color 0.2s ease",
            boxShadow: isActive ? "0 3px 12px rgba(192,57,43,0.28)" : "none",
          }}>{s.label}</button>
        );
      })}
    </div>
  );
}

// ── Main NewsScreen ───────────────────────────────────────────────────────────
type MainView = "list" | "item";

export default function NewsScreen({ onBack }: Props) {
  const [view, setView] = useState<MainView>("list");
  const [activeItem, setActiveItem] = useState<FeedItemDetail | null>(null);
  const [section, setSection] = useState<"news" | "recalls" | "alerts">("news");

  // Three separate feeds/trust-tiers. News re-polls every 5 min, alerts
  // every 10, recalls every 30 (openFDA's underlying data only updates
  // weekly, so there's no need to poll often).
  const { items: news,    loading: newsLoading }    = usePolledFeed<NewsArticle>(listNews, 5 * 60 * 1000);
  const { items: recalls, loading: recallsLoading } = usePolledFeed<FoodRecall>(listRecalls, 30 * 60 * 1000);
  const { items: alerts,  loading: alertsLoading }  = usePolledFeed<HealthAlert>(listAlerts, 10 * 60 * 1000);

  const openItem = (item: FeedItemDetail) => { setActiveItem(item); setView("item"); };

  if (view === "item" && activeItem) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", background: "linear-gradient(160deg,#f5e8e0 0%,#f0d0c0 55%,#e8b8a8 100%)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "52px 20px 0", flexShrink: 0, borderBottom: "1px solid rgba(192,57,43,0.10)" }}>
          <div style={{ fontFamily: "'Montserrat', Helvetica, sans-serif", fontWeight: 700, fontSize: "1.3rem", color: "#3a1810" }}>CapCare+ Reads</div>
        </div>
        <FeedItemView item={activeItem} onBack={() => setView("list")}/>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "linear-gradient(160deg,#f5e8e0 0%,#f0d0c0 55%,#e8b8a8 100%)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "52px 20px 16px", display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.50)", borderBottom: "1.5px solid rgba(192,57,43,0.10)", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "rgba(192,57,43,0.10)", border: "1.5px solid rgba(192,57,43,0.22)", borderRadius: 12, color: "#c0392b", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1.1rem", flexShrink: 0 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Montserrat', Helvetica, sans-serif", fontWeight: 700, fontSize: "1.55rem", color: "#c0392b", lineHeight: 1.1 }}>News</div>
          <div style={{ fontFamily: "Outfit, Helvetica, sans-serif", fontSize: "0.82rem", fontWeight: 300, color: "rgba(154,80,64,0.60)", marginTop: 2 }}>Headlines, recalls & health alerts</div>
        </div>
      </div>

      {/* Tabs: pinned outside the scroll area so they never scroll out of
          view once Recalls/Alerts content is taller than one screen. */}
      <div style={{ padding: "14px 20px", flexShrink: 0, background: "rgba(255,255,255,0.35)", borderBottom: "1px solid rgba(192,57,43,0.08)" }}>
        <NewsSectionTabs active={section} onSelect={setSection}/>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 48px", display: "flex", flexDirection: "column", gap: 14, animation: "slideUp 0.32s ease both" }}>
        <SectionErrorBoundary key={section} label={section}>
          {section === "news"    && <NewsBox articles={news} loading={newsLoading} onOpen={openItem}/>}
          {section === "recalls" && <RecallsBox recalls={recalls} loading={recallsLoading} onOpen={openItem}/>}
          {section === "alerts"  && <AlertsBox alerts={alerts} loading={alertsLoading} onOpen={openItem}/>}
        </SectionErrorBoundary>
      </div>
    </div>
  );
}

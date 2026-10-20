import { useCallback, useEffect, useState } from "react";
import SplashScreen          from "./SplashScreen";
import OnboardingScreen      from "./OnboardingScreen";
import LoginScreen           from "./LoginScreen";
import SignupScreen          from "./SignupScreen";
import SuccessScreen         from "./SuccessScreen";
import OnboardingGuideScreen from "./OnboardingGuideScreen";
import HubScreen             from "./HubScreen";
import AllergyScreen         from "./AllergyScreen";
import FeedScreen            from "./FeedScreen";
import NewsScreen            from "./NewsScreen";
import SymptomScreen         from "./SymptomScreen";
import SettingsScreen        from "./SettingsScreen";
import TutorialOverlay       from "./TutorialOverlay";
import { bootstrapProfile, clearSession, isLoggedIn } from "./api";

type Screen =
  | "splash" | "reopen" | "onboarding" | "login" | "signup"
  | "success" | "guide" | "hub" | "settings"
  | "allergy" | "feed" | "symptom" | "news";

// Chance of showing a brief reload screen (same animation as the first splash)
// when the app is reopened with an existing session, instead of jumping
// straight to the hub.
const REOPEN_LOADING_CHANCE = 0.4;

// Must match HubScreen's own HUB_ITEMS order (allergy, feed, symptom), so
// going back from a screen re-centers the same mushroom that opened it
// instead of always resetting to Home.
const HUB_ORDER = ["allergy", "feed", "symptom"] as const;

export type TutorialContext = "hub" | "allergy" | "feed" | "symptom";

export default function App() {
  // Persistent login: if a backend session token already exists, skip straight to
  // hub, but sometimes show a brief reload screen first (same splash animation)
  // so reopening the app doesn't always feel instant/jarring.
  const [screen, setScreen] = useState<Screen>(() => {
    if (!isLoggedIn()) return "splash";
    return Math.random() < REOPEN_LOADING_CHANCE ? "reopen" : "hub";
  });
  const [fading,       setFading      ] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutCtx,       setTutCtx      ] = useState<TutorialContext>("hub");
  const [firstTime,    setFirstTime   ] = useState(false);
  // Which hub mushroom should be centered next time the hub is shown, so
  // "back" from a screen returns to the mushroom that opened it, not always Home.
  const [hubIdx,       setHubIdx      ] = useState(1);

  // Refresh the cached profile (name/age/weight/height/allergens) from the
  // backend on boot, so any screen's synchronous localStorage reads reflect
  // the latest saved data. If the token turns out to be invalid, bounce to splash.
  useEffect(() => {
    if (!isLoggedIn()) return;
    bootstrapProfile().then((profile) => {
      if (!profile) setScreen("splash");
    });
  }, []);

  const navigate = useCallback((to: Screen) => {
    setFading(true);
    setTimeout(() => {
      setScreen(to);
      requestAnimationFrame(() => requestAnimationFrame(() => setFading(false)));
    }, 680);
  }, []);

  const triggerTutorial = (ctx: TutorialContext = "hub") => {
    setTutCtx(ctx);
    setTimeout(() => setShowTutorial(true), 800);
  };

  // Guide completed after signup → show hub tutorial
  const handleGuideComplete = () => {
    navigate("hub");
    triggerTutorial("hub");
  };

  // Signup → guide → hub (full onboarding flow)
  const handleSignupSuccess = () => {
    setFirstTime(true);
    navigate("success");
  };

  // Login → hub directly, never re-runs onboarding
  const handleLoginSuccess = () => {
    setFirstTime(false);
    navigate("hub");
  };

  // Logout → clear session (token + cached profile) → splash
  const handleLogout = () => {
    clearSession();
    navigate("splash");
  };

  return (
    <div className="size-full relative overflow-hidden bg-black">
      <div style={{
        position: "absolute", inset: 0,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.68s ease",
        willChange: "opacity",
      }}>
        {screen === "splash"     && <SplashScreen onComplete={() => navigate("onboarding")}/>}
        {screen === "reopen"     && <SplashScreen quick onComplete={() => navigate("hub")}/>}
        {screen === "onboarding" && <OnboardingScreen onNavigate={navigate}/>}
        {screen === "login"      && <LoginScreen  onBack={() => navigate("onboarding")} onSuccess={handleLoginSuccess}/>}
        {screen === "signup"     && <SignupScreen  onBack={() => navigate("onboarding")} onSuccess={handleSignupSuccess}/>}
        {screen === "success"    && <SuccessScreen onComplete={() => navigate("guide")}/>}
        {screen === "guide"      && <OnboardingGuideScreen onComplete={handleGuideComplete}/>}
        {screen === "hub"        && (
          <HubScreen
            initialIdx={hubIdx}
            onNavigate={dest => {
              // News lives on the Home card, so treat it like "feed" for
              // which mushroom to return to.
              const cardDest = dest === "news" ? "feed" : dest;
              const idx = (HUB_ORDER as readonly string[]).indexOf(cardDest);
              if (idx !== -1) setHubIdx(idx);
              navigate(dest as Screen);
              // Per-screen tutorial on first visit, skip feed (item F9) and news
              if (dest !== "feed" && dest !== "news" && !localStorage.getItem(`cc_tut_${dest}`)) {
                localStorage.setItem(`cc_tut_${dest}`, "1");
                const ctx = dest as TutorialContext;
                setTimeout(() => { setTutCtx(ctx); setShowTutorial(true); }, 1200);
              }
            }}
            onSettings={() => navigate("settings")}
          />
        )}
        {screen === "settings"   && (
          <SettingsScreen
            onBack={() => navigate("hub")}
            onLogout={handleLogout}
            onShowTutorial={() => { navigate("hub"); triggerTutorial("hub"); }}
          />
        )}
        {screen === "allergy"    && <AllergyScreen  onBack={() => navigate("hub")}/>}
        {screen === "feed"       && (
          <FeedScreen
            onBack={() => navigate("hub")}
            firstTime={firstTime}
            onProfile={() => navigate("settings")}
          />
        )}
        {screen === "symptom"    && <SymptomScreen   onBack={() => navigate("hub")}/>}
        {screen === "news"       && <NewsScreen      onBack={() => navigate("hub")}/>}
      </div>

      {showTutorial && (
        <TutorialOverlay
          context={tutCtx}
          onDone={() => {
            setShowTutorial(false);
            localStorage.setItem("cc_tutorial_done", "1");
          }}
        />
      )}
    </div>
  );
}
